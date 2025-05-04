import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiService } from './ai.service';
import { CommonModule } from '@angular/common';


interface Message {
  text: string;
  sender: 'user' | 'ai';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  userInput: string = '';  // Stores user input
  messages: Message[] = []; // Stores chat messages
  inputText: string = '';
  isSidebarOpen = false;
  suggestions: string[] = [];
  errorMessage: string | null = null;
  addedTexts: string[] = [];
  private lastSuggestionTime: number = 0;
  private suggestionInterval: number = 60000 / 70; // 70 times per minute
  private aiInstanceIndex: number = 0;
  isDarkMode = false;
  reply: string = ''; // Declare the reply property
  isChatBoxOpen: boolean = false; // State to track chatbox visibility

  constructor(private aiService: AiService) {
    console.log('AppComponent initialized.');
  }

  ngOnInit() {
    const savedMode = localStorage.getItem('darkMode');
    this.isDarkMode = savedMode === 'true';
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());

    // Force re-render to ensure styles are applied
    const body = document.body;
    if (this.isDarkMode) {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }

  // toggleSidebar() {
  //   this.isSidebarOpen = !this.isSidebarOpen;
  // }

  toggleChatBox() {
    this.isChatBoxOpen = !this.isChatBoxOpen;
  }

  async getSuggestions() {
    console.log('Fetching suggestions for input:', this.inputText);

    if (this.inputText.trim() === '') {
      this.errorMessage = '⚠️ Please enter some text before generating suggestions.';
      return;
    }

    try {
      this.errorMessage = null;
      const lastThreeHundredChars = this.inputText.trim().slice(-300);
      let suggestions: string[] = [];

      switch (this.aiInstanceIndex) {
        case 0:
          suggestions = await this.aiService.generateSuggestionsFromGroq1(lastThreeHundredChars);
          break;
        case 1:
          suggestions = await this.aiService.generateSuggestionsFromGroq2(lastThreeHundredChars);
          break;
        case 2:
          suggestions = await this.aiService.generateSuggestionsFromGemini(lastThreeHundredChars);
          break;
      }

      this.aiInstanceIndex = (this.aiInstanceIndex + 1) % 3;
      this.suggestions = suggestions;
      console.log('Suggestions received:', this.suggestions);

      if (this.suggestions.length === 0) {
        throw new Error('No suggestions returned from the AI service.');
      }
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);

      if (error.message.includes('Network')) {
        this.errorMessage = '🚨 Network error! Please check your internet connection and try again.';
      } else if (error.status === 500) {
        this.errorMessage = '⚠️ Server error! The AI service is currently unavailable. Please try again later.';
      } else if (error.status === 404) {
        this.errorMessage = '⚠️ AI service not found. Please check your API configurations.';
      } else {
        this.errorMessage = '❌ Something went wrong! Please try again.';
      }

      // Provide a fallback suggestion if all AI services fail
      this.suggestions = [
        "Try rewording your sentence.",
        "Consider simplifying your text.",
        "Check for grammar or spelling errors."
      ];
    }
  }

  addSuggestion(suggestion: string) {
    console.log('Adding suggestion to input:', suggestion);
    this.inputText += ' ' + suggestion;
    this.suggestions = [];
  }

  addText() {
    console.log('Adding text to addedTexts:', this.inputText);
    if (this.inputText.trim() !== '') {
      this.addedTexts.push(this.inputText);
      this.inputText = '';
    }
  }

  copyText(text: string) {
    console.log('Copying text to clipboard:', text);
    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }

  copyInputText() {
    console.log('Copying input text to clipboard:', this.inputText);
    navigator.clipboard.writeText(this.inputText).then(() => {
      console.log('Text copied to clipboard');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }

  adjustTextareaHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    if (textarea.value.trim() === '') {
      textarea.style.height = '25px'; // Set to min-height
    } else {
      textarea.style.height = textarea.scrollHeight + 'px';
    }

    const currentTime = Date.now();
    const wordCount = textarea.value.trim().split(/\s+/).length;
    if (wordCount > 2 && currentTime - this.lastSuggestionTime >= this.suggestionInterval) {
      console.log('Fetching suggestions due to word count and interval.');
      this.lastSuggestionTime = currentTime;
      this.getSuggestions();
    }
  }

  async sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage: Message = { text: this.userInput, sender: 'user' };
    this.messages.push(userMessage);
    this.reply = 'Typing...';

    try {
      let aiReply = '';
      switch (this.aiInstanceIndex) {
        case 0:
          aiReply = await this.aiService.getReplyFromGroq(this.userInput);
          break;
        case 1:
          aiReply = await this.aiService.getReplyFromGroq(this.userInput);
          break;
      }

      this.aiInstanceIndex = (this.aiInstanceIndex + 1) % 2;
      this.messages.push({ text: aiReply, sender: 'ai' });
    } catch (error) {
      console.error('Chat error:', error);
      this.messages.push({
        text: '❌ Error getting response. Please try again.',
        sender: 'ai',
      });
    }

    this.userInput = '';
  }
}

