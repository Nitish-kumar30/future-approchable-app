export interface GuideStep {
  title: string;
  explanation: string;
  badPrompt: string;
  goodPrompt: string;
  whyBetter: string;
}

export interface GuideCategory {
  id: string;
  label: string;
  steps: GuideStep[];
}

export const promptingGuideData: GuideCategory[] = [
  {
    id: "general",
    label: "General Tips",
    steps: [
      {
        title: "Be Clear & Specific",
        explanation: "Vague prompts lead to vague answers. Include details about what you want, the format, and any constraints.",
        badPrompt: "Tell me about marketing.",
        goodPrompt: "Explain 5 digital marketing strategies for a B2B SaaS startup with a limited budget under $5,000/month. Include pros, cons, and expected ROI for each.",
        whyBetter: "The improved prompt specifies the number of strategies, the business type, budget constraint, and desired output format — giving the AI clear guardrails to produce actionable, relevant content.",
      },
      {
        title: "Use Examples (Few-Shot Prompting)",
        explanation: "Providing examples helps the AI understand the exact format, tone, and style you want.",
        badPrompt: "Write product descriptions.",
        goodPrompt: "Write a product description for a wireless mouse. Follow this format:\n\nExample:\nProduct: Ergonomic Keyboard\nDescription: Type in comfort with our ergonomic split keyboard. Designed to reduce wrist strain, it features mechanical switches, customizable RGB lighting, and a detachable wrist rest. Perfect for professionals who spend long hours at the desk.\n\nNow write one for: Wireless Mouse",
        whyBetter: "By giving an example, you show the AI the exact structure, tone, and level of detail you expect — eliminating guesswork and ensuring consistent output.",
      },
      {
        title: "Encourage Step-by-Step Thinking",
        explanation: "Asking the AI to think through a problem step-by-step (chain-of-thought) produces more accurate and reasoned responses.",
        badPrompt: "What's the answer to this math problem: If a store offers 20% off and then an additional 15% off the sale price, what's the total discount on a $200 item?",
        goodPrompt: "Solve this step-by-step:\n\nA store offers 20% off, then an additional 15% off the sale price. What's the total discount on a $200 item?\n\nPlease show:\n1. The price after the first discount\n2. The price after the second discount\n3. The total amount saved\n4. The effective discount percentage",
        whyBetter: "Breaking the problem into explicit steps prevents the AI from jumping to conclusions and makes the reasoning transparent and verifiable.",
      },
      {
        title: "Iterative Refinement",
        explanation: "Don't expect perfection on the first try. Refine your prompt by adding constraints, adjusting tone, or narrowing scope.",
        badPrompt: "Write a blog post about AI.",
        goodPrompt: "Write an 800-word blog post about how small retail businesses can use AI-powered inventory management to reduce waste and increase profits. Target audience: non-technical store owners. Tone: conversational and encouraging. Include 2 real-world examples and a call-to-action at the end.",
        whyBetter: "The refined prompt adds word count, specific topic focus, target audience, tone, structural requirements, and a clear deliverable — transforming a generic request into a precise brief.",
      },
      {
        title: "Leverage the AI's Knowledge",
        explanation: "Ask the AI to draw on its training data for specific domains, frameworks, or methodologies.",
        badPrompt: "Help me with my business strategy.",
        goodPrompt: "Using Porter's Five Forces framework, analyze the competitive landscape for a new organic coffee subscription service entering the US market. For each force, rate the threat level (low/medium/high) and explain your reasoning.",
        whyBetter: "Referencing a specific framework (Porter's Five Forces) gives the AI a structured lens to work through, producing organized, comprehensive analysis instead of generic advice.",
      },
      {
        title: "Role-Playing & Personas",
        explanation: "Assigning the AI a specific role or persona changes how it approaches the problem and the expertise it draws upon.",
        badPrompt: "Review my resume.",
        goodPrompt: "Act as a senior tech recruiter at a Fortune 500 company with 15 years of experience. Review the following resume for a Senior Software Engineer position. Evaluate it on: 1) Impact quantification, 2) Technical skill presentation, 3) ATS compatibility, 4) Overall narrative. Provide specific, actionable feedback for each area.",
        whyBetter: "The persona establishes expertise level and perspective, while the evaluation criteria ensure comprehensive, structured feedback rather than surface-level comments.",
      },
    ],
  },
  {
    id: "content",
    label: "Content Creation",
    steps: [
      {
        title: "Specify Your Audience",
        explanation: "The same topic requires different treatment depending on who will read it. Always define your audience.",
        badPrompt: "Explain machine learning.",
        goodPrompt: "Explain machine learning to a group of HR managers who have no technical background. Use workplace analogies they'd relate to (like hiring decisions and pattern recognition in resumes). Keep it under 300 words and avoid jargon.",
        whyBetter: "Defining the audience (HR managers), preferred analogies (workplace-related), length, and jargon level ensures the explanation is actually useful to the intended readers.",
      },
      {
        title: "Define Tone & Style",
        explanation: "Explicitly stating the tone prevents mismatched output. A fundraising email needs a different voice than a technical spec.",
        badPrompt: "Write an email about our new feature.",
        goodPrompt: "Write a product announcement email for our new AI-powered search feature. Tone: excited but professional (think Apple keynote energy). Length: 150 words max. Structure: hook → key benefit → one specific example → CTA to try it. Avoid buzzwords like 'revolutionary' or 'game-changing'.",
        whyBetter: "Specifying tone with a reference point (Apple keynote), explicit structure, word limit, and words to avoid gives the AI precise creative boundaries.",
      },
      {
        title: "Define Structure & Format",
        explanation: "Tell the AI exactly how you want the output organized — headings, bullet points, tables, or specific sections.",
        badPrompt: "Compare these two project management tools.",
        goodPrompt: "Create a comparison table of Asana vs Monday.com for a 50-person marketing team. Include these columns: Feature, Asana, Monday.com, Winner. Cover these rows: Pricing (for 50 users), Ease of use, Integrations with marketing tools, Reporting capabilities, Mobile app quality. Add a summary recommendation at the bottom.",
        whyBetter: "Specifying the exact table structure, columns, rows, team size context, and summary format ensures you get a directly usable deliverable rather than a rambling comparison.",
      },
    ],
  },
  {
    id: "research",
    label: "Research & Analysis",
    steps: [
      {
        title: "Document Summarization",
        explanation: "When asking the AI to summarize or analyze content, specify what aspects matter most and the desired output format.",
        badPrompt: "Summarize this article.",
        goodPrompt: "Summarize this article in 3 sections:\n1. Key Findings (3-5 bullet points)\n2. Methodology Used (1 paragraph)\n3. Implications for Our Team (2-3 actionable takeaways)\n\nFocus specifically on findings related to customer retention and ignore the sections about brand awareness.",
        whyBetter: "Defining the summary structure, specifying what to focus on and what to ignore, and requesting actionable takeaways makes the summary immediately useful for decision-making.",
      },
      {
        title: "Data Analysis Guidance",
        explanation: "When working with data, specify the type of analysis, what patterns to look for, and how to present findings.",
        badPrompt: "Analyze this sales data.",
        goodPrompt: "Analyze the following quarterly sales data and provide:\n1. Top 3 trends you notice (with percentage changes)\n2. Any anomalies or outliers worth investigating\n3. A forecast for next quarter based on the patterns\n4. 2 specific recommendations for the sales team\n\nPresent findings in a format suitable for a 5-minute executive briefing.",
        whyBetter: "Specifying the analysis depth, output sections, and presentation context (executive briefing) ensures you get concise, decision-ready insights rather than a data dump.",
      },
      {
        title: "Specify Output Format",
        explanation: "Be explicit about whether you want prose, bullet points, tables, JSON, or any other specific format.",
        badPrompt: "List some project risks.",
        goodPrompt: "Identify 5 key risks for a cloud migration project. For each risk, provide:\n- Risk Name\n- Likelihood (High/Medium/Low)\n- Impact (High/Medium/Low)\n- Mitigation Strategy (2-3 sentences)\n- Risk Owner (suggested role)\n\nFormat as a markdown table.",
        whyBetter: "The structured format with defined fields and table output creates a deliverable that can be directly pasted into a project management document.",
      },
    ],
  },
  {
    id: "brainstorming",
    label: "Brainstorming",
    steps: [
      {
        title: "Generate Diverse Ideas",
        explanation: "When brainstorming, ask for variety explicitly — different approaches, perspectives, or constraint levels.",
        badPrompt: "Give me ideas for a team building event.",
        goodPrompt: "Generate 10 team building activity ideas for a remote team of 25 people across 3 time zones. Include:\n- 3 low-budget options (under $100)\n- 3 medium-budget options ($100-$500)\n- 2 high-budget options ($500+)\n- 2 unconventional/creative options\n\nFor each, note: duration, required tools, and team size suitability.",
        whyBetter: "Categorizing ideas by budget, requiring variety (unconventional options), and adding practical constraints ensures you get a diverse, actionable list rather than generic suggestions.",
      },
      {
        title: "Use Structured Brainstorming Formats",
        explanation: "Apply proven frameworks like SCAMPER, Six Thinking Hats, or pros/cons to get more thorough ideation.",
        badPrompt: "How can I improve my product?",
        goodPrompt: "Use the SCAMPER method to generate improvement ideas for our mobile banking app:\n- Substitute: What components could be replaced?\n- Combine: What features could be merged?\n- Adapt: What could be borrowed from other industries?\n- Modify: What could be enlarged/minimized?\n- Put to other use: What new use cases exist?\n- Eliminate: What could be removed to simplify?\n- Reverse: What could be done in the opposite way?\n\nProvide 2 specific ideas for each letter.",
        whyBetter: "Using the SCAMPER framework forces systematic exploration of improvement angles, preventing the AI from defaulting to obvious suggestions.",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    steps: [
      {
        title: "Acknowledge Uncertainty",
        explanation: "Ask the AI to flag when it's uncertain or when multiple valid approaches exist, so you can make informed decisions.",
        badPrompt: "Fix this bug in my code.",
        goodPrompt: "Here's a React component that's causing an infinite re-render loop. Please:\n1. Identify the root cause of the infinite loop\n2. Rate your confidence in the diagnosis (high/medium/low)\n3. Provide 2 possible fixes, explaining the trade-offs of each\n4. Flag any assumptions you're making about the rest of the codebase\n5. Suggest what to check if neither fix resolves the issue",
        whyBetter: "Asking for confidence ratings, multiple solutions, and assumptions makes the AI's reasoning transparent and helps you evaluate the advice critically.",
      },
      {
        title: "Break Down Complex Tasks",
        explanation: "For complex problems, ask the AI to decompose the task before solving it. This prevents oversimplification.",
        badPrompt: "Build me a user authentication system.",
        goodPrompt: "I need to implement user authentication for a React + Node.js app. Before writing any code, please:\n1. List all the components/modules needed\n2. Identify security considerations for each\n3. Suggest the implementation order (dependencies first)\n4. Flag any decisions I need to make (e.g., JWT vs sessions, OAuth providers)\n\nThen implement step 1 only, with detailed comments.",
        whyBetter: "Decomposing the task first ensures nothing is missed, reveals decision points early, and lets you course-correct before the AI writes extensive code.",
      },
      {
        title: "Include Context & Constraints",
        explanation: "Always share relevant context: tech stack, team size, timeline, existing code patterns, and any constraints.",
        badPrompt: "How should I deploy my app?",
        goodPrompt: "Recommend a deployment strategy for our app with these constraints:\n- Stack: React frontend, Python FastAPI backend, PostgreSQL DB\n- Team: 3 developers, no dedicated DevOps\n- Budget: Under $200/month\n- Traffic: ~10,000 daily users, spikes during US business hours\n- Requirements: Auto-scaling, CI/CD, staging environment\n- Current setup: Everything runs on a single EC2 instance\n\nCompare 2-3 options and recommend the best fit.",
        whyBetter: "Providing full context (stack, team, budget, traffic, requirements, current state) eliminates assumptions and ensures recommendations are realistic and actionable for your specific situation.",
      },
    ],
  },
  {
    id: "examples",
    label: "Full Examples",
    steps: [
      {
        title: "Marketing Strategy Prompt",
        explanation: "A comprehensive prompt that combines multiple best practices: role-playing, specific constraints, structured output, and clear deliverables.",
        badPrompt: "Create a marketing plan.",
        goodPrompt: "Act as a senior digital marketing strategist. Create a 90-day marketing plan for launching a B2B SaaS product (project management tool for agencies, priced at $49/user/month).\n\nTarget audience: Creative agency owners with 10-50 employees.\n\nStructure the plan as:\n1. Month 1: Awareness (channels, budget allocation, KPIs)\n2. Month 2: Engagement (content strategy, lead magnets, nurture sequences)\n3. Month 3: Conversion (trial optimization, sales enablement, retention hooks)\n\nBudget: $15,000 total. Include a channel-by-channel budget breakdown table.\n\nFor each tactic, include: expected reach, estimated cost, and success metric.",
        whyBetter: "This prompt combines persona (strategist), specific product context, structured timeline, budget constraints, and measurable deliverables — producing a plan that's ready for executive review.",
      },
      {
        title: "Technical Report Prompt",
        explanation: "A detailed prompt for generating a structured technical document with specific requirements for depth and format.",
        badPrompt: "Write a report about our system performance.",
        goodPrompt: "Write a quarterly system performance report for Q3 2024. Audience: CTO and engineering leadership.\n\nStructure:\n1. Executive Summary (3-4 sentences)\n2. Key Metrics Dashboard (table format):\n   - Uptime %, Avg response time, P99 latency, Error rate, Deployment frequency\n3. Incidents & Resolutions (top 3 incidents with root cause, impact, resolution, prevention)\n4. Infrastructure Changes (what changed, why, impact)\n5. Recommendations (top 3 priorities for Q4 with effort estimates)\n\nTone: Technical but accessible. Use data to support every claim. Flag areas where data is incomplete.\n\nHere is the raw data: [paste data]",
        whyBetter: "The prompt defines audience, exact sections with sub-requirements, tone, data expectations, and transparency requirements — producing a polished, presentation-ready report.",
      },
    ],
  },
];
