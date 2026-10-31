export type AssistantLanguage = "English" | "Hindi" | "Tamil" | "Telugu" | "Bengali" | "Marathi";

export type Urgency = "emergency" | "urgent" | "routine";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type SourceCitation = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  reviewedAt: string;
  excerpt: string;
};

export type AssistantResponse = {
  answer: string;
  urgency: Urgency;
  emergencyGuidance?: string;
  followUpQuestions: string[];
  structuredSummary: {
    concern: string;
    symptoms: string[];
    duration: string;
    pregnancyContext: string;
    nextStep: string;
  };
  citations: SourceCitation[];
  grounded: boolean;
  fallback: boolean;
  privacyNote: string;
};

export type AssistantRequest = {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
  age?: string;
  language?: AssistantLanguage;
};
