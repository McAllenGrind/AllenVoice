# AllenVoice

**AllenVoice** is an AI-powered voice agent platform designed to help businesses handle customer calls, answer common questions, use company-specific knowledge, and eventually perform actions such as call routing and appointment handling.

The goal of AllenVoice is to give businesses a simple interface for deploying and managing an intelligent voice assistant without requiring technical knowledge.

---

## Project Status

AllenVoice is currently under active development.

The project has progressed from an initial backend prototype into a functional SaaS foundation with:

* A Node.js / Express / TypeScript backend
* PostgreSQL database integration
* Prisma ORM and database migrations
* Company management
* Company-specific knowledge bases
* Knowledge document CRUD operations
* Conversation and message data models
* AI provider integration architecture
* Authentication architecture
* React frontend
* SaaS dashboard interface
* Company and agent management interfaces
* Call and statistics interfaces currently being developed

The next major milestone is connecting the complete interface with the voice and telephony infrastructure.

---

## Vision

AllenVoice is built around one simple idea:

> Give every business an AI employee capable of answering the phone.

Instead of leaving customers unanswered when employees are busy, AllenVoice will be able to understand the caller, search the company's knowledge, respond naturally, and redirect the conversation to a human when necessary.

The platform is designed for businesses such as:

* Retail stores
* Repair shops
* Clinics
* Restaurants
* Service companies
* Small and medium-sized businesses

---

## Core Features

### AI Agent

Each company can operate its own AI agent configured with company-specific information.

The agent is designed to:

* Answer customer questions
* Understand natural language
* Retrieve information from the company knowledge base
* Maintain conversation context
* Escalate conversations to a human when required

### Knowledge Base

Companies can provide information that AllenVoice uses when responding to customers.

The knowledge system currently supports the management of company-specific knowledge documents.

Examples include:

* Opening hours
* Services
* Prices
* Policies
* Frequently asked questions
* Product information
* Internal business information

### Conversations

AllenVoice stores conversations and messages to create a history of interactions between customers and the AI agent.

This architecture will support:

* Conversation history
* Call summaries
* Customer request analysis
* AI performance analysis
* Business statistics

### Business Dashboard

The frontend provides a central interface where businesses will be able to manage AllenVoice.

The dashboard is designed around simplicity: business owners should be able to understand what their AI agent is doing without needing to understand the technical infrastructure behind it.

---

## Analytics Direction

AllenVoice is also being developed as a source of business intelligence.

The analytics interface is intended to help companies understand:

* How many calls AllenVoice handled
* When customers call the most
* Why customers are calling
* How conversations ended
* Which questions the agent could not answer
* Which information may be missing from the knowledge base
* Potential improvements the business could make

The objective is not simply to answer calls, but to transform customer conversations into useful information for the business.

---

## Tech Stack

### Backend

* Node.js
* Express
* TypeScript
* Prisma ORM
* PostgreSQL
* JWT-based authentication architecture

### Frontend

* React
* TypeScript
* SaaS dashboard architecture

### AI

AllenVoice is designed to support multiple AI providers.

Current architecture includes support for:

* OpenAI
* Anthropic

This also allows different AI models to be evaluated for the same tasks.

### Voice & Telephony

Voice and telephony integration is part of the AllenVoice roadmap.

The architecture is being prepared for services such as:

* Twilio
* Telnyx
* Real-time voice AI
* Human call transfer

---

## Project Structure

AllenVoice/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── package.json
│
├── frotend/
│   ├──src/
│   │  ├── components/
│   │  ├── pages/
│   │  └── ...
│   
│   └── package.json
│
├── docs/
│
└── README.md


---

## Current Data Architecture

The current database architecture includes concepts such as:

Company
   │
   ├── KnowledgeBase
   │       │
   │       └── KnowledgeDocument
   │
   └── Conversation
           │
           └── Message


This structure allows every company to maintain isolated business knowledge and conversation history.

---

## Current Development Priorities

Current development is focused on:

1. Completing the AllenVoice frontend
2. Connecting the frontend to the backend API
3. Finalizing authentication
4. Improving AI knowledge retrieval
5. Implementing voice calling
6. Connecting telephony infrastructure
7. Adding human call transfer
8. Building useful customer-call analytics
9. Preparing the platform for real-world business testing

---

## Long-Term Direction

AllenVoice is intended to evolve from a voice-answering assistant into a complete AI communication layer for businesses.

Future capabilities may include:

* AI phone reception
* Appointment scheduling
* Customer qualification
* Sales assistance
* Customer support
* Intelligent call routing
* Automatic call summaries
* Business analytics
* Knowledge gap detection
* Voice customization
* Human escalation

---

## Development

AllenVoice is being developed as both a software engineering project and a real SaaS product intended for deployment with real businesses.

The project follows an iterative development approach:

Build → Test → Improve → Deploy

---

## Current Phase

Phase: SaaS Interface + Core AI Infrastructure

Backend foundation: done
Database architecture: done
Knowledge management: done
Frontend foundation: done
Business dashboard: in progress
Authentication: in progress
AI integration: in progress
Voice calling: planned
Telephony integration: planned
Real-world business testing: planned