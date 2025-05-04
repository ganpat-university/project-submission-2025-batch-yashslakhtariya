import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';


@Injectable({
  providedIn: 'root',
})
export class AiService {
  // Removed duplicate getReply function
  private genAI: any | undefined;
  private model: any;
  private groq1: any;
  private groq2: any;
  private systemPrompt: string = `You are an AI text assistant. Your task is to very fastly suggest 10 accurate and possible next words or sentence completions based on the given input text. Provide your completions as a JSON array of strings without any formatting (just start completion in response starting with word after the last input word). Example response: ["suggestion1", "suggestion2", ...]`;
  private systemPromptalt: string = `You are an AI text assistant. Your task is to very fastly suggest 10 accurate and possible next words or sentence completions based on the given input text. Provide your completions as a JSON array of strings without any formatting (just start completion in response starting with word after the last input word). Example response: ["suggestion1", "suggestion2", ...] Don't give any other text than given JSON format`;
  private chatbotPrompt: string = `You are the RapidLekh AI chatbot assistant. Your purpose is to answer questions about the RapidLekh AI project in short and concise way. RapidLekh AI is an intelligent text assistant for sentence completion and prediction using AI. It is built by Yash Lakhtariya, Hiren Makwana, and Varishtha Patni. It uses AI models: Google Gemini, Meta LLAMA 3.1 8B, and Google Gemma 2 9B. Strictly do not ever answer questions unrelated to this project! If any unrelated question is asked by user, just say "I am not able to answer that question. Please ask me about RapidLekh AI project." and also don't give long answers. Just give short and concise answers. Also, do not ever give answers in markdown format. Just give plain text answers.`;

  private cache: Map<string, string[]> = new Map();

  constructor() {
    const geminiApiKey = environment.geminiApiKey;
    const groqApiKey1 = environment.groqApiKey1;
    const groqApiKey2 = environment.groqApiKey2;
    this.initializeService(geminiApiKey, groqApiKey1, groqApiKey2);
    console.log('AiService initialized with API keys.');
  }

  private initializeService(geminiApiKey: string, groqApiKey1: string, groqApiKey2: string) {
    try {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-8b',
        systemInstruction: this.systemPrompt,
      });
      this.groq1 = new Groq({ apiKey: groqApiKey1, dangerouslyAllowBrowser: true });
      this.groq2 = new Groq({ apiKey: groqApiKey2, dangerouslyAllowBrowser: true });
      console.log('Services initialized successfully.');
    } catch (error) {
      console.error('Error initializing AI services:', error);
    }
  }

  async generateSuggestionsFromGroq1(prompt: string): Promise<string[]> {
    console.log('Generating suggestions from Groq1 for prompt:', prompt);
    
    if (!this.groq1) {
      console.warn('Groq1 API key is missing or invalid.');
      return ['Error: Groq1 service is unavailable. Please try again later.'];
    }

    if (this.cache.has(prompt)) {
      console.log('Returning cached suggestions for Groq1');
      return this.cache.get(prompt) || [];
    }

    try {
      const result = await this.groq1.chat.completions.create({
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: 'llama-3.1-8b-instant',
      });
      const suggestions = JSON.parse(result.choices[0]?.message?.content || '[]');
      console.log('Suggestions from Groq1:', suggestions);

      this.cache.set(prompt, suggestions);
      return suggestions.filter((suggestion: any) => suggestion.trim().length > 0);
    } catch (error) {
      console.error('Error generating suggestions from Groq1:', error);
      return ['Error: Unable to fetch suggestions from Groq1. Please check your internet connection or try again later.'];
    }
  }

  async generateSuggestionsFromGroq2(prompt: string): Promise<string[]> {
    console.log('Generating suggestions from Groq2 for prompt:', prompt);

    if (!this.groq2) {
      console.warn('Groq2 API key is missing or invalid.');
      return ['Error: Groq2 service is unavailable. Please try again later.'];
    }

    if (this.cache.has(prompt)) {
      console.log('Returning cached suggestions for Groq2');
      return this.cache.get(prompt) || [];
    }

    // try {
    //   const result = await this.groq2.chat.completions.create({
    //     messages: [
    //       { role: 'system', content: this.systemPromptalt },
    //       { role: 'user', content: prompt }
    //     ],
    //     model: 'gemma2-9b-it',
    //   });
    //   const suggestions = JSON.parse(result.choices[0]?.message?.content || '[]');
    //   console.log('Suggestions from Groq2:', suggestions);

    //   this.cache.set(prompt, suggestions);
    //   return suggestions.filter((suggestion: any) => suggestion.trim().length > 0);
    // } catch (error) {
    //   console.error('Error generating suggestions from Groq2:', error);
    //   return ['Error: Unable to fetch suggestions from Groq2. Please check your internet connection or try again later.'];
    // }
    try {
      // Construct the messages array with valid roles
      const messages = [
        { role: 'system', content: this.systemPromptalt.replace(/\n/g, '\\n') },
        { role: 'user', content: prompt.replace(/\n/g, '\\n') }
      ];

      const result = await this.groq2.chat.completions.create({
        messages: messages,
        model: 'gemma2-9b-it',
      });

      let suggestions = JSON.parse(result.choices[0]?.message?.content || '[]');
      console.log('Raw suggestions from Groq2:', suggestions);

      // Clean up quirks like "▁▁" from the suggestions
      suggestions = suggestions.map((suggestion: string) =>
        suggestion.replace(/▁▁/g, '').trim()
      );

      console.log('Cleaned suggestions from Groq2:', suggestions);

      this.cache.set(prompt, suggestions);
      return suggestions.filter((suggestion: any) => suggestion.length > 0);
    } catch (error) {
      console.error('Error generating suggestions from Groq2:', error);
      return ['Error: Unable to fetch suggestions from Groq2. Please check your internet connection or try again later.'];
    }
  }

  async generateSuggestionsFromGemini(prompt: string): Promise<string[]> {
    console.log('Generating suggestions from Gemini for prompt:', prompt);

    if (!this.genAI || !this.model) {
      console.warn('Gemini API key is missing or invalid.');
      return ['Error: Gemini service is unavailable. Please try again later.'];
    }

    if (this.cache.has(prompt)) {
      console.log('Returning cached suggestions for Gemini');
      return this.cache.get(prompt) || [];
    }

    try {
      const result = await this.model.generateContent(prompt);
      const suggestions = JSON.parse(result.response.text() || '[]');
      console.log('Suggestions from Gemini:', suggestions);

      this.cache.set(prompt, suggestions);
      return suggestions.filter((suggestion: any) => suggestion.trim().length > 0);
    } catch (error) {
      console.error('Error generating suggestions from Gemini:', error);
      return ['Error: Unable to fetch suggestions from Gemini. Please check your API key or try again later.'];
    }
  }
  async getReplyFromGroq(prompt: string): Promise<string> {
    console.log('Fetching reply from Groq for prompt:', prompt);
  
    if (!this.groq1) {
      console.warn('Groq1 service is not available.');
      return "Error: Groq service is unavailable. Please try again later.";
    }
  
    try {
      const result = await this.groq1.chat.completions.create({
        messages: [
          { role: 'system', content: this.chatbotPrompt },
          { role: 'user', content: prompt }
        ],
        model: 'llama3-70b-8192',
      });
  
      const reply = result.choices[0]?.message?.content || "No reply received from Groq.";
      console.log('Reply from Groq:', reply);
      return reply;
    } catch (err) {
      console.error('Error fetching reply from Groq:', err);
      return "Failed to get response from Groq.";
    }
  }
  
  }
  
  
