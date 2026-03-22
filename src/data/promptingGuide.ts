export interface GuideStep {
  title: string;
  explanation: string;
  additionalTips?: string[];
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
        additionalTips: [
          "Clearly state your task or question at the beginning of your message.",
          "Provide context and details to help the AI understand your needs.",
          "Break complex tasks into smaller, manageable steps.",
        ],
        badPrompt: "Help me with a presentation.",
        goodPrompt: "I need to create a 10-slide presentation on Q3 sales performance for our executive team meeting next Monday. Please include:\n1. An executive summary slide\n2. Revenue breakdown by product line\n3. Year-over-year comparison charts\n4. Top 5 wins and challenges\n5. Q4 forecast and recommendations\n\nKeep the tone professional but engaging. Our company uses a blue and white color scheme.",
        whyBetter: "The improved prompt specifies the number of slides, the topic, the audience, the deadline, the exact content needed, the tone, and even brand colors — giving the AI clear guardrails to produce a targeted, usable result.",
      },
      {
        title: "Use Examples (Few-Shot Prompting)",
        explanation: "Providing examples helps the AI understand the exact format, tone, and style you want.",
        additionalTips: [
          "Include 1-3 examples of the desired output format.",
          "Show the pattern you want the AI to follow.",
          "Examples are especially useful for consistent formatting across multiple outputs.",
        ],
        badPrompt: "Write a professional email.",
        goodPrompt: "Write a professional email declining a meeting invitation. Follow this tone and format:\n\nExample:\nSubject: Re: Project Sync - Thursday\nHi Sarah,\nThank you for the invitation. Unfortunately, I have a conflicting commitment during that time slot. Could we reschedule to Friday afternoon, or would it work to send me the meeting notes afterward?\nBest regards,\nAlex\n\nNow write one declining a vendor sales demo scheduled for Tuesday, suggesting they send a recorded demo instead.",
        whyBetter: "By giving an example, you show the AI the exact structure, tone, and level of detail you expect — eliminating guesswork and ensuring consistent output.",
      },
      {
        title: "Encourage Step-by-Step Thinking",
        explanation: "Asking the AI to think through a problem step-by-step (chain-of-thought) produces more accurate and reasoned responses.",
        additionalTips: [
          "Use phrases like 'Think step by step' or 'Walk me through your reasoning.'",
          "Ask the AI to show its work for math or logic problems.",
          "This technique reduces errors on complex reasoning tasks.",
        ],
        badPrompt: "How can we improve team productivity?",
        goodPrompt: "Our marketing team of 8 people is struggling with productivity. We use Slack, Asana, and Google Workspace. Common issues include:\n- Too many meetings (avg 4hrs/day)\n- Unclear task ownership\n- Missed deadlines on content deliverables\n\nPlease think step by step:\n1. Analyze the root causes based on the symptoms described\n2. Suggest 3 process improvements with expected impact\n3. Recommend specific tool configurations or workflows\n4. Provide a 30-day implementation plan",
        whyBetter: "Breaking the problem into explicit steps prevents the AI from jumping to conclusions and makes the reasoning transparent and verifiable.",
      },
      {
        title: "Iterative Refinement",
        explanation: "Don't expect perfection on the first try. Refine your prompt by adding constraints, adjusting tone, or narrowing scope.",
        additionalTips: [
          "Start with a basic prompt and refine based on the output.",
          "Add constraints like word count, tone, or format in follow-up prompts.",
          "Use phrases like 'Make it more concise' or 'Add more technical detail.'",
        ],
        badPrompt: "Make this sound better:\n\"We are pleased to inform you that your application has been received and is being processed.\"",
        goodPrompt: "Rewrite this sentence to be warmer and more conversational while keeping it professional. Target reading level: 8th grade. Keep it under 20 words.\n\nOriginal: \"We are pleased to inform you that your application has been received and is being processed.\"\n\nTone reference: Think friendly customer service rep, not corporate lawyer.",
        whyBetter: "The refined prompt adds tone direction, a reading level target, word limit, and a relatable tone reference — transforming a generic 'make it better' into a precise editing brief.",
      },
      {
        title: "Leverage the AI's Knowledge",
        explanation: "Ask the AI to draw on its training data for specific domains, frameworks, or methodologies.",
        additionalTips: [
          "Reference specific frameworks (SWOT, Porter's Five Forces, AIDA, etc.).",
          "Ask the AI to act as a domain expert.",
          "Specify which aspects of a topic you need covered.",
        ],
        badPrompt: "Help me with marketing.",
        goodPrompt: "Using the AIDA framework (Attention, Interest, Desire, Action), create a marketing copy for our new eco-friendly smartphone accessories line. Target audience: environmentally conscious millennials (25-35). The product line includes:\n- Biodegradable phone cases ($29.99)\n- Solar-powered chargers ($49.99)\n- Recycled material screen protectors ($14.99)\n\nFor each product, write the AIDA copy in under 100 words.",
        whyBetter: "Referencing a specific framework (AIDA) gives the AI a structured lens to work through, producing organized, comprehensive marketing copy instead of generic advice.",
      },
      {
        title: "Role-Playing & Personas",
        explanation: "Assigning the AI a specific role or persona changes how it approaches the problem and the expertise it draws upon.",
        additionalTips: [
          "Specify the role, experience level, and perspective you want.",
          "Combine role-playing with specific evaluation criteria.",
          "Personas help the AI adopt the right expertise and communication style.",
        ],
        badPrompt: "How do I negotiate with suppliers?",
        goodPrompt: "Act as a senior procurement manager with 15 years of experience in textile manufacturing. I'm a small business owner about to negotiate with a new fabric supplier for our clothing line.\n\nContext:\n- Order size: 500 yards/month of organic cotton\n- Their quoted price: $12/yard\n- Market rate: $8-$15/yard depending on quality\n- We need NET 60 payment terms\n- This would be our first order with them\n\nPlease:\n1. Suggest a negotiation strategy\n2. Provide 3 specific talking points\n3. Recommend a counteroffer with justification\n4. List potential concessions we could offer",
        whyBetter: "The persona establishes expertise level and perspective, while the detailed context and structured ask ensure the AI provides practical, situation-specific negotiation advice rather than generic tips.",
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
        additionalTips: [
          "Include the audience's knowledge level and background.",
          "Specify what they care about or need from the content.",
          "Tailor examples and analogies to their experience.",
        ],
        badPrompt: "Write a blog post about cybersecurity.",
        goodPrompt: "Write an 800-word blog post about cybersecurity best practices for small business owners (non-technical audience, 10-50 employees). \n\nRequirements:\n- Use analogies they'd relate to (locking doors, safes, etc.)\n- Focus on 5 actionable steps they can implement this week\n- Include estimated cost for each solution (free to $50/month range)\n- Avoid jargon — explain any technical terms in parentheses\n- End with a simple cybersecurity checklist they can print out\n\nTone: Helpful and reassuring, not fear-mongering.",
        whyBetter: "Defining the audience (small business owners), their knowledge level (non-technical), preferred analogies, actionable format, and tone ensures the content is actually useful to the intended readers.",
      },
      {
        title: "Define Tone & Style",
        explanation: "Explicitly stating the tone prevents mismatched output. A fundraising email needs a different voice than a technical spec.",
        additionalTips: [
          "Use a reference point for tone (e.g., 'like Apple keynote energy').",
          "Specify words or phrases to avoid.",
          "Include a style example if possible.",
        ],
        badPrompt: "Write a product description for an office chair.",
        goodPrompt: "Write a product description for the ErgoMax Pro office chair ($599). \n\nTone: Premium but approachable (think Dyson product pages — technical confidence without being stuffy).\n\nStructure:\n- Headline (max 8 words, benefit-focused)\n- Subheadline (one sentence, the key differentiator)\n- 4 feature bullets (feature → benefit format)\n- One paragraph of body copy (80 words max)\n- CTA line\n\nKey selling points: 12-hour comfort rating, patented lumbar system, recycled ocean plastic frame, 10-year warranty.\n\nAvoid: 'revolutionary', 'game-changing', 'best-in-class', 'synergy'.",
        whyBetter: "Specifying tone with a reference point (Dyson), explicit structure, word limits, key selling points, and words to avoid gives the AI precise creative boundaries.",
      },
      {
        title: "Define Structure & Format",
        explanation: "Tell the AI exactly how you want the output organized — headings, bullet points, tables, or specific sections.",
        additionalTips: [
          "Specify the exact format: table, bullets, numbered list, etc.",
          "Include column headers or section names.",
          "Mention if the output needs to be copy-pasteable into a specific tool.",
        ],
        badPrompt: "Help me prepare for a presentation.",
        goodPrompt: "I'm presenting our Q2 marketing results to the CEO in 15 minutes. Create:\n\n1. An elevator pitch (30 seconds, 3 sentences max) covering:\n   - Overall revenue impact\n   - Best performing channel\n   - Biggest learning\n\n2. Anticipated tough questions (5) with suggested answers:\n   - Format: Q: [question] → A: [2-sentence answer]\n\n3. A one-page cheat sheet with key metrics:\n   - Format as a markdown table: Metric | Q2 Result | vs Q1 | vs Target\n\nAssume these results: Revenue up 23%, social media drove 45% of leads, email open rates dropped 12%, customer acquisition cost reduced by $15.",
        whyBetter: "Specifying the exact output structure (elevator pitch format, Q&A format, table format) with concrete data ensures you get a directly usable deliverable rather than generic presentation advice.",
      },
    ],
  },
  {
    id: "research",
    label: "Document Summary & Q&A",
    steps: [
      {
        title: "Document Summarization",
        explanation: "When asking the AI to summarize or analyze content, specify what aspects matter most and the desired output format.",
        additionalTips: [
          "Refer to uploaded documents by name for clarity.",
          "Ask for citations or page references when summarizing long documents.",
          "Specify the type of summary: executive, technical, or action-oriented.",
        ],
        badPrompt: "Summarize this report.",
        goodPrompt: "Summarize the attached 'Tech Industry Trends 2024' report in three sections:\n\n1. **Key Findings** (5 bullet points, each under 20 words)\n2. **Methodology Critique** (1 paragraph — assess the sample size, data sources, and potential biases)\n3. **Action Items for Our Team** (3 specific recommendations based on the findings, considering we're a mid-size B2B SaaS company)\n\nFocus on: AI adoption trends and cybersecurity spending.\nIgnore: Consumer hardware and gaming sections.\n\nFlag any claims in the report that seem unsupported by the data presented.",
        whyBetter: "Defining the summary structure, specifying what to focus on and what to ignore, requesting a methodology critique, and asking for flagged unsupported claims makes the summary immediately useful for decision-making.",
      },
    ],
  },
  {
    id: "data-analysis",
    label: "Data Analysis",
    steps: [
      {
        title: "Data Analysis Guidance",
        explanation: "When working with data, specify the type of analysis, what patterns to look for, and how to present findings.",
        additionalTips: [
          "Specify the desired output format (tables, charts description, bullet points).",
          "Mention what decisions the analysis will inform.",
          "Ask for anomalies and outliers specifically if relevant.",
        ],
        badPrompt: "Analyze this sales data.",
        goodPrompt: "Analyze the attached 'Sales Data 2023' spreadsheet and provide:\n\n1. **Revenue Trends**: Monthly revenue trend with % change month-over-month. Identify the 3 best and worst performing months with likely explanations.\n\n2. **Product Analysis**: Top 5 products by revenue and by units sold. Flag any products with declining sales (>10% drop over 3+ months).\n\n3. **Customer Segments**: Breakdown by customer segment. Which segment has the highest lifetime value? Which has the highest growth rate?\n\n4. **Anomalies**: Flag any data points that seem unusual (sudden spikes, drops, or patterns that break from trends).\n\n5. **Recommendations**: Based on the data, suggest 3 specific actions for Q1 2024 with expected impact.\n\nPresent findings in a format suitable for a 10-minute executive briefing. Use tables where possible.",
        whyBetter: "Specifying the analysis depth, output sections, anomaly detection, and presentation context (executive briefing) ensures you get concise, decision-ready insights rather than a data dump.",
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
        additionalTips: [
          "Categorize ideas by budget, effort, or timeline.",
          "Ask for both conventional and unconventional options.",
          "Include practical details for each idea (cost, time, tools needed).",
        ],
        badPrompt: "Give me ideas for a team building event.",
        goodPrompt: "Generate 10 team building activity ideas for a remote team of 25 people across 3 time zones (US Pacific, US Eastern, UK). Include:\n- 3 low-budget options (under $100 total)\n- 3 medium-budget options ($100-$500)\n- 2 high-budget options ($500+)\n- 2 unconventional/creative options that no one would expect\n\nFor each idea, provide:\n- Activity name and brief description\n- Duration\n- Required tools/platforms\n- Time zone friendliness rating (1-5)\n- Team engagement level (introvert-friendly to extrovert-heavy)\n\nAvoid: trivia nights and virtual happy hours (we've done those).",
        whyBetter: "Categorizing ideas by budget, requiring variety, adding practical constraints (time zones, team size), and excluding already-tried activities ensures you get a diverse, actionable list.",
      },
      {
        title: "Use Structured Brainstorming Formats",
        explanation: "Apply proven frameworks like SCAMPER, comparison tables, or pros/cons to get more thorough ideation.",
        additionalTips: [
          "Reference specific brainstorming frameworks (SCAMPER, Six Thinking Hats, etc.).",
          "Ask for structured output like comparison tables.",
          "Specify evaluation criteria for the ideas.",
        ],
        badPrompt: "Compare some project management tools.",
        goodPrompt: "Create a detailed comparison table of Asana vs Monday.com vs Notion for our 15-person marketing agency. \n\nEvaluation criteria (rate each 1-5):\n| Feature | Asana | Monday.com | Notion |\n|---------|-------|------------|--------|\n| Ease of onboarding | | | |\n| Client collaboration features | | | |\n| Time tracking | | | |\n| Reporting/dashboards | | | |\n| Template library | | | |\n| Integrations (Slack, Google, Figma) | | | |\n| Pricing (for 15 users) | | | |\n| Mobile app quality | | | |\n\nAfter the table:\n1. Declare a winner with reasoning\n2. Note any deal-breakers for an agency use case\n3. Suggest a 2-week trial plan to evaluate the top pick",
        whyBetter: "The structured comparison table with specific criteria, team context, and a follow-up action plan produces a decision-ready analysis rather than generic tool descriptions.",
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
        additionalTips: [
          "Ask for confidence levels on diagnoses.",
          "Request multiple possible solutions with trade-offs.",
          "Ask the AI to flag assumptions it's making.",
        ],
        badPrompt: "Fix this bug in my code.",
        goodPrompt: "Here's a React component that's causing an infinite re-render loop. Please:\n1. Identify the root cause of the infinite loop\n2. Rate your confidence in the diagnosis (high/medium/low)\n3. Provide 2 possible fixes, explaining the trade-offs of each\n4. Flag any assumptions you're making about the rest of the codebase\n5. Suggest what to check if neither fix resolves the issue",
        whyBetter: "Asking for confidence ratings, multiple solutions, trade-offs, and assumptions makes the AI's reasoning transparent and helps you evaluate the advice critically.",
      },
      {
        title: "Break Down Complex Tasks",
        explanation: "For complex problems, ask the AI to decompose the task before solving it. This prevents oversimplification.",
        additionalTips: [
          "Ask for a task breakdown before implementation.",
          "Request dependency mapping between subtasks.",
          "Have the AI identify decision points early.",
        ],
        badPrompt: "Build me a user authentication system.",
        goodPrompt: "I need to implement user authentication for a React + Node.js app. Before writing any code, please:\n1. List all the components/modules needed\n2. Identify security considerations for each\n3. Suggest the implementation order (dependencies first)\n4. Flag any decisions I need to make (e.g., JWT vs sessions, OAuth providers)\n\nThen implement step 1 only, with detailed comments.",
        whyBetter: "Decomposing the task first ensures nothing is missed, reveals decision points early, and lets you course-correct before the AI writes extensive code.",
      },
      {
        title: "Include Context & Constraints",
        explanation: "Always share relevant context: tech stack, team size, timeline, existing code patterns, and any constraints.",
        additionalTips: [
          "Include your tech stack and versions.",
          "Mention team size and skill level.",
          "Specify budget and timeline constraints.",
        ],
        badPrompt: "How should I deploy my app?",
        goodPrompt: "Recommend a deployment strategy for our app with these constraints:\n- Stack: React frontend, Python FastAPI backend, PostgreSQL DB\n- Team: 3 developers, no dedicated DevOps\n- Budget: Under $200/month\n- Traffic: ~10,000 daily users, spikes during US business hours\n- Requirements: Auto-scaling, CI/CD, staging environment\n- Current setup: Everything runs on a single EC2 instance\n\nCompare 2-3 options and recommend the best fit. Include estimated monthly cost and migration effort for each.",
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
        badPrompt: "Create a marketing plan for our new product.",
        goodPrompt: "Act as a senior digital marketing strategist with experience in sustainable consumer products.\n\nCreate a 90-day go-to-market plan for our new line of eco-friendly smartphone accessories (cases, chargers, screen protectors). \n\nTarget audience: Environmentally conscious millennials and Gen-Z (ages 22-38) in urban US markets.\n\nBudget: $25,000 total for 90 days.\n\nStructure the plan as:\n\n**Month 1 — Awareness**\n- Channel strategy (specify platforms and ad formats)\n- Influencer partnership plan (micro vs macro, budget split)\n- Content calendar outline (themes per week)\n- KPIs with specific targets\n\n**Month 2 — Engagement**\n- Community building tactics\n- Email nurture sequence (number of emails, topics)\n- UGC campaign concept\n- Retargeting strategy\n\n**Month 3 — Conversion**\n- Promotional calendar\n- Referral program structure\n- Retention hooks for repeat purchase\n- Post-purchase engagement plan\n\nFor each tactic include: estimated cost, expected reach/engagement, and success metric.\n\nEnd with a budget allocation table by channel and month.",
        whyBetter: "This prompt combines persona (strategist), specific product context, detailed audience definition, structured timeline, budget constraints, and measurable deliverables — producing a plan that's ready for executive review.",
      },
      {
        title: "Financial Report Analysis",
        explanation: "A detailed prompt for generating a structured analysis with specific requirements for depth, format, and audience awareness.",
        badPrompt: "Analyze our Q2 financial results.",
        goodPrompt: "Analyze the attached Q2 2024 financial report. I'm preparing a board presentation for our CFO.\n\n**Deliverables:**\n\n1. **Executive Summary** (3-4 sentences max)\n   - Overall financial health assessment\n   - One positive highlight and one concern\n\n2. **Key Metrics Dashboard** (table format):\n   | Metric | Q2 2024 | Q1 2024 | Q2 2023 | QoQ Change | YoY Change |\n   |--------|---------|---------|---------|------------|------------|\n   - Include: Revenue, Gross Margin, EBITDA, Net Income, Cash Position, Burn Rate, Customer Count, ARR\n\n3. **Revenue Deep Dive**:\n   - Breakdown by product line and geography\n   - Identify fastest growing and declining segments\n   - Compare against forecast (% variance)\n\n4. **Risk Factors** (top 3):\n   - Each with: description, potential impact ($), likelihood, suggested mitigation\n\n5. **CFO Talking Points** (5 bullet points):\n   - Positive framing but honest about challenges\n   - Include specific numbers to cite\n\n6. **Questions the Board Will Ask** (5 questions with suggested answers)\n\nTone: Precise, data-driven, executive-appropriate. Round numbers to nearest $K for readability.\n\nFlag any metrics that are significantly above or below industry benchmarks.",
        whyBetter: "The prompt defines audience (CFO/board), exact sections with sub-requirements, comparison periods, tone, and anticipatory preparation (board questions) — producing a polished, presentation-ready analysis.",
      },
    ],
  },
];
