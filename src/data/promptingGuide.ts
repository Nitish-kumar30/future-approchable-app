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
        explanation: "Vague prompts lead to vague answers. Clearly state your task or question at the beginning of your message, provide context and details, and break complex tasks into smaller, manageable steps.",
        additionalTips: [
          "Clearly state your task or question at the beginning of your message.",
          "Provide context and details to help Claude understand your needs.",
          "Break complex tasks into smaller, manageable steps.",
        ],
        badPrompt: "Help me with a presentation.",
        goodPrompt: "I need help creating a 10-slide presentation for our quarterly sales meeting. The presentation should cover our Q2 sales performance, top-selling products, and sales targets for Q3. Please provide an outline with key points for each slide.",
        whyBetter: "The good prompt provides specific details about the task, including the number of slides, the purpose of the presentation, and the key topics to be covered.",
      },
      {
        title: "Use Examples (Few-Shot Prompting)",
        explanation: "Providing examples helps Claude understand the exact format, tone, and style you want. Show Claude an example of the kind of output you're looking for.",
        additionalTips: [
          "Include 1-3 examples of the desired output format.",
          "Show the pattern you want Claude to follow.",
          "Examples are especially useful for consistent formatting across multiple outputs.",
        ],
        badPrompt: "Write a professional email.",
        goodPrompt: "I need to write a professional email to a client about a project delay. Here's a similar email I've sent before:\n\n'Dear [Client],\nI hope this email finds you well. I wanted to update you on the progress of [Project Name]. Unfortunately, we've encountered an unexpected issue that will delay our completion date by approximately two weeks. We're working diligently to resolve this and will keep you updated on our progress.\nPlease let me know if you have any questions or concerns.\nBest regards,\n[Your Name]'\n\nHelp me draft a new email following a similar tone and structure, but for our current situation where we're delayed by a month due to supply chain issues.",
        whyBetter: "The good prompt provides a concrete example of the desired style and tone, giving Claude a clear reference point for the new email.",
      },
      {
        title: "Encourage Step-by-Step Thinking",
        explanation: "For complex tasks, ask Claude to 'think step-by-step' or 'explain your reasoning.' This leads to more accurate and detailed responses.",
        additionalTips: [
          "Use phrases like 'Think step by step' or 'Walk me through your reasoning.'",
          "Ask Claude to show its work for math or logic problems.",
          "This technique reduces errors on complex reasoning tasks.",
        ],
        badPrompt: "How can I improve team productivity?",
        goodPrompt: "I'm looking to improve my team's productivity. Think through this step-by-step, considering the following factors:\n1. Current productivity blockers (e.g., too many meetings, unclear priorities)\n2. Potential solutions (e.g., time management techniques, project management tools)\n3. Implementation challenges\n4. Methods to measure improvement\n\nFor each step, please provide a brief explanation of your reasoning. Then summarize your ideas at the end.",
        whyBetter: "The good prompt asks Claude to think through the problem systematically, providing a guided structure for the response and asking for explanations of the reasoning process. It also prompts Claude to create a summary at the end for easier reading.",
      },
      {
        title: "Iterative Refinement",
        explanation: "If Claude's first response isn't quite right, ask for clarifications or modifications. You can always say 'That's close, but can you adjust X to be more like Y?'",
        additionalTips: [
          "Start with a basic prompt and refine based on the output.",
          "Add constraints like word count, tone, or format in follow-up prompts.",
          "Use phrases like 'Make it more concise' or 'Add more technical detail.'",
        ],
        badPrompt: "Make it better.",
        goodPrompt: "That's a good start, but please refine it further. Make the following adjustments:\n1. Make the tone more casual and friendly\n2. Add a specific example of how our product has helped a customer\n3. Shorten the second paragraph to focus more on the benefits rather than the features",
        whyBetter: "The good prompt provides specific feedback and clear instructions for improvements, allowing Claude to make targeted adjustments instead of just relying on Claude's innate sense of what 'better' might be — which is likely different from the user's definition!",
      },
      {
        title: "Leverage Claude's Knowledge",
        explanation: "Claude has broad knowledge across many fields. Don't hesitate to ask for explanations or background information — but be sure to include relevant context so the response is maximally targeted.",
        additionalTips: [
          "Reference specific frameworks (SWOT, Porter's Five Forces, AIDA, etc.).",
          "Ask Claude to act as a domain expert.",
          "Specify which aspects of a topic you need covered.",
        ],
        badPrompt: "What is marketing? How do I do it?",
        goodPrompt: "I'm developing a marketing strategy for a new eco-friendly cleaning product line. Can you provide an overview of current trends in green marketing? Please include:\n1. Key messaging strategies that resonate with environmentally conscious consumers\n2. Effective channels for reaching this audience\n3. Examples of successful green marketing campaigns from the past year\n4. Potential pitfalls to avoid (e.g., greenwashing accusations)\n\nThis information will help me shape our marketing approach.",
        whyBetter: "The good prompt asks for specific, contextually relevant information that leverages Claude's broad knowledge base. It provides context for how the information will be used, which helps Claude frame its answer in the most relevant way.",
      },
      {
        title: "Role-Playing & Personas",
        explanation: "Ask Claude to adopt a specific role or perspective when responding. This changes how it approaches the problem and the expertise it draws upon.",
        additionalTips: [
          "Specify the role, experience level, and perspective you want.",
          "Combine role-playing with specific evaluation criteria.",
          "Personas help Claude adopt the right expertise and communication style.",
        ],
        badPrompt: "Help me prepare for a negotiation.",
        goodPrompt: "You are a fabric supplier for my backpack manufacturing company. I'm preparing for a negotiation with this supplier to reduce prices by 10%. As the supplier, please provide:\n1. Three potential objections to our request for a price reduction\n2. For each objection, suggest a counterargument from my perspective\n3. Two alternative proposals the supplier might offer instead of a straight price cut\n\nThen, switch roles and provide advice on how I, as the buyer, can best approach this negotiation to achieve our goal.",
        whyBetter: "This prompt uses role-playing to explore multiple perspectives of the negotiation, providing a more comprehensive preparation. Role-playing also encourages Claude to more readily adopt the nuances of specific perspectives, increasing the intelligence and performance of Claude's response.",
      },
    ],
  },
  {
    id: "content",
    label: "Content Creation",
    steps: [
      {
        title: "Specify Your Audience",
        explanation: "Tell Claude who the content is for. The same topic requires different treatment depending on who will read it — always define your audience, their knowledge level, and what they care about.",
        additionalTips: [
          "Include the audience's knowledge level and background.",
          "Specify what they care about or need from the content.",
          "Tailor examples and analogies to their experience.",
        ],
        badPrompt: "Write something about cybersecurity.",
        goodPrompt: "I need to write a blog post about cybersecurity best practices for small business owners. The audience is not very tech-savvy, so the content should be:\n1. Easy to understand, avoiding technical jargon where possible\n2. Practical, with actionable tips they can implement quickly\n3. Engaging and slightly humorous to keep their interest\n\nPlease provide an outline for a 1000-word blog post that covers the top 5 cybersecurity practices these business owners should adopt.",
        whyBetter: "The good prompt specifies the audience, desired tone, and key characteristics of the content, giving Claude clear guidelines for creating appropriate and effective output.",
      },
      {
        title: "Define Tone & Style",
        explanation: "Explicitly stating the tone prevents mismatched output. Describe the desired tone, mention key points from your style guide, and use a reference point (e.g., 'like Apple keynote energy').",
        additionalTips: [
          "Use a reference point for tone (e.g., 'think Dyson product pages').",
          "Specify words or phrases to avoid.",
          "Include a style example if possible.",
        ],
        badPrompt: "Write a product description.",
        goodPrompt: "Please help me write a product description for our new ergonomic office chair. Use a professional but engaging tone. Our brand voice is friendly, innovative, and health-conscious. The description should:\n1. Highlight the chair's key ergonomic features\n2. Explain how these features benefit the user's health and productivity\n3. Include a brief mention of the sustainable materials used\n4. End with a call-to-action encouraging readers to try the chair\n\nAim for about 200 words.",
        whyBetter: "The good prompt provides clear guidance on the tone, style, and specific elements to include in the product description.",
      },
      {
        title: "Define Structure & Format",
        explanation: "Tell Claude exactly how you want the output organized — headings, bullet points, tables, or specific sections. Provide a basic outline or list of points you want covered.",
        additionalTips: [
          "Specify the exact format: table, bullets, numbered list, etc.",
          "Include column headers or section names.",
          "Mention if the output needs to be copy-pasteable into a specific tool.",
        ],
        badPrompt: "Create a presentation on our company results.",
        goodPrompt: "I need to create a presentation on our Q2 results. Structure this with the following sections:\n1. Overview\n2. Sales Performance\n3. Customer Acquisition\n4. Challenges\n5. Q3 Outlook\n\nFor each section, suggest 3-4 key points to cover, based on typical business presentations. Also, recommend one type of data visualization (e.g., graph, chart) that would be effective for each section.",
        whyBetter: "This prompt provides a clear structure and asks for specific elements (key points and data visualizations) for each section.",
      },
    ],
  },
  {
    id: "research",
    label: "Document Summary & Q&A",
    steps: [
      {
        title: "Document Summarization",
        explanation: "Be specific about what you want. Ask for a summary of specific aspects or sections, refer to attached documents by name, and request citations so Claude cites specific parts of the document in its answers.",
        additionalTips: [
          "Refer to uploaded documents by name for clarity.",
          "Ask for citations or page references when summarizing long documents.",
          "Specify the type of summary: executive, technical, or action-oriented.",
        ],
        badPrompt: "Summarize this report for me.",
        goodPrompt: "I've attached a 50-page market research report called 'Tech Industry Trends 2023'. Can you provide a 2-paragraph summary focusing on AI and machine learning trends? Then, please answer these questions:\n1. What are the top 3 AI applications in business for this year?\n2. How is machine learning impacting job roles in the tech industry?\n3. What potential risks or challenges does the report mention regarding AI adoption?\n\nPlease cite specific sections or page numbers when answering these questions.",
        whyBetter: "This prompt specifies the exact focus of the summary, provides specific questions, and asks for citations, ensuring a more targeted and useful response. It also indicates the ideal summary output structure, such as limiting the response to 2 paragraphs.",
      },
    ],
  },
  {
    id: "data-analysis",
    label: "Data Analysis",
    steps: [
      {
        title: "Data Analysis Guidance",
        explanation: "When working with data, clearly describe the format you want the data in, specify what patterns to look for, and describe how to present findings.",
        additionalTips: [
          "Specify the desired output format (tables, charts description, bullet points).",
          "Mention what decisions the analysis will inform.",
          "Ask for anomalies and outliers specifically if relevant.",
        ],
        badPrompt: "Analyze our sales data.",
        goodPrompt: "I've attached a spreadsheet called 'Sales Data 2023'. Can you analyze this data and present the key findings in the following format:\n\n1. Executive Summary (2-3 sentences)\n\n2. Key Metrics:\n   - Total sales for each quarter\n   - Top-performing product category\n   - Highest growth region\n\n3. Trends:\n   - List 3 notable trends, each with a brief explanation\n\n4. Recommendations:\n   - Provide 3 data-driven recommendations, each with a brief rationale\n\nAfter the analysis, suggest three types of data visualizations that would effectively communicate these findings.",
        whyBetter: "This prompt provides a clear structure for the analysis, specifies key metrics to focus on, and asks for recommendations and visualization suggestions for further formatting.",
      },
    ],
  },
  {
    id: "brainstorming",
    label: "Brainstorming",
    steps: [
      {
        title: "Generate Diverse Ideas",
        explanation: "Use Claude to generate ideas by asking for a list of possibilities or alternatives. Be specific about what topics you want covered in the brainstorming.",
        additionalTips: [
          "Categorize ideas by budget, effort, or timeline.",
          "Ask for both conventional and unconventional options.",
          "Include practical details for each idea (cost, time, tools needed).",
        ],
        badPrompt: "Give me some team-building ideas.",
        goodPrompt: "We need to come up with team-building activities for our remote team of 20 people. Can you help me brainstorm by:\n1. Suggesting 10 virtual team-building activities that promote collaboration\n2. For each activity, briefly explain how it fosters teamwork\n3. Indicate which activities are best for:\n   a) Ice-breakers\n   b) Improving communication\n   c) Problem-solving skills\n4. Suggest one low-cost option and one premium option.",
        whyBetter: "This prompt provides specific parameters for the brainstorming session, including the number of ideas, type of activities, and additional categorization, resulting in a more structured and useful output.",
      },
      {
        title: "Use Structured Brainstorming Formats",
        explanation: "Request responses in specific formats like bullet points, numbered lists, or tables for easier reading. Apply proven frameworks to get more thorough ideation.",
        additionalTips: [
          "Reference specific brainstorming frameworks (SCAMPER, Six Thinking Hats, etc.).",
          "Ask for structured output like comparison tables.",
          "Specify evaluation criteria for the ideas.",
        ],
        badPrompt: "Compare project management software options.",
        goodPrompt: "We're considering three different project management software options: Asana, Trello, and Microsoft Project. Can you compare these in a table format using the following criteria:\n1. Key Features\n2. Ease of Use\n3. Scalability\n4. Pricing (include specific plans if possible)\n5. Integration capabilities\n6. Best suited for (e.g., small teams, enterprise, specific industries)",
        whyBetter: "This prompt requests a specific structure (table) for the comparison and provides clear criteria, making the information easy to understand and apply.",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    steps: [
      {
        title: "Acknowledge Uncertainty",
        explanation: "Tell Claude that it should say it doesn't know if it doesn't know. Ask the AI to flag when it's uncertain or when multiple valid approaches exist, so you can make informed decisions.",
        additionalTips: [
          "Ask for confidence levels on diagnoses.",
          "Request multiple possible solutions with trade-offs.",
          "Ask Claude to flag assumptions it's making.",
        ],
        badPrompt: "Fix this bug in my code.",
        goodPrompt: "Here's a React component that's causing an infinite re-render loop. Please:\n1. Identify the root cause of the infinite loop\n2. Rate your confidence in the diagnosis (high/medium/low)\n3. Provide 2 possible fixes, explaining the trade-offs of each\n4. Flag any assumptions you're making about the rest of the codebase\n5. Suggest what to check if neither fix resolves the issue",
        whyBetter: "Asking for confidence ratings, multiple solutions, trade-offs, and assumptions makes Claude's reasoning transparent and helps you evaluate the advice critically.",
      },
      {
        title: "Break Down Complex Tasks",
        explanation: "If a task seems too large and Claude is missing steps or not performing certain steps well, break it into smaller steps and work through them one message at a time.",
        additionalTips: [
          "Ask for a task breakdown before implementation.",
          "Request dependency mapping between subtasks.",
          "Have Claude identify decision points early.",
        ],
        badPrompt: "Build me a user authentication system.",
        goodPrompt: "I need to implement user authentication for a React + Node.js app. Before writing any code, please:\n1. List all the components/modules needed\n2. Identify security considerations for each\n3. Suggest the implementation order (dependencies first)\n4. Flag any decisions I need to make (e.g., JWT vs sessions, OAuth providers)\n\nThen implement step 1 only, with detailed comments.",
        whyBetter: "Decomposing the task first ensures nothing is missed, reveals decision points early, and lets you course-correct before Claude writes extensive code.",
      },
      {
        title: "Include Context & Constraints",
        explanation: "Claude doesn't retain information from previous conversations, so include all necessary context in each new conversation — tech stack, team size, timeline, existing code patterns, and any constraints.",
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
        badPrompt: "Help me create a marketing strategy.",
        goodPrompt: "As a senior marketing consultant, I need your help developing a comprehensive marketing strategy for our new eco-friendly smartphone accessory line. Our target audience is environmentally conscious millennials and Gen Z consumers. Please provide a detailed strategy that includes:\n\n1. Market Analysis:\n   - Current trends in eco-friendly tech accessories\n   - 2-3 key competitors and their strategies\n   - Potential market size and growth projections\n\n2. Target Audience Persona:\n   - Detailed description of our ideal customer\n   - Their pain points and how our products solve them\n\n3. Marketing Mix:\n   - Product: Key features to highlight\n   - Price: Suggested pricing strategy with rationale\n   - Place: Recommended distribution channels\n   - Promotion:\n     a) 5 marketing channels to focus on, with pros and cons for each\n     b) 3 creative campaign ideas for launch\n\n4. Content Strategy:\n   - 5 content themes that would resonate with our audience\n   - Suggested content types (e.g., blog posts, videos, infographics)\n\n5. KPIs and Measurement:\n   - 5 key metrics to track\n   - Suggested tools for measuring these metrics\n\nPlease present this information in a structured format with headings and bullet points. Where relevant, explain your reasoning or provide brief examples.\n\nAfter outlining the strategy, please identify any potential challenges or risks we should be aware of, and suggest mitigation strategies for each.",
        whyBetter: "This prompt combines multiple techniques including role assignment, specific task breakdown, structured output request, brainstorming (for campaign ideas and content themes), and asking for explanations. It provides clear guidelines while allowing room for Claude's analysis and creativity.",
      },
      {
        title: "Financial Report Analysis",
        explanation: "A detailed prompt for generating a structured analysis with specific requirements for depth, format, and audience awareness.",
        badPrompt: "Analyze this financial report.",
        goodPrompt: "I've attached our company's Q2 financial report titled 'Q2_2023_Financial_Report.pdf'. Act as a seasoned CFO and analyze this report and prepare a briefing for our board of directors. Please structure your analysis as follows:\n\n1. Executive Summary (3-4 sentences highlighting key points)\n\n2. Financial Performance Overview:\n   a) Revenue: Compare to previous quarter and same quarter last year\n   b) Profit margins: Gross and Net, with explanations for any significant changes\n   c) Cash flow: Highlight any concerns or positive developments\n\n3. Key Performance Indicators:\n   - List our top 5 KPIs and their current status (Use a table format)\n   - For each KPI, provide a brief explanation of its significance and any notable trends\n\n4. Segment Analysis:\n   - Break down performance by our three main business segments\n   - Identify the best and worst performing segments, with potential reasons for their performance\n\n5. Balance Sheet Review:\n   - Highlight any significant changes in assets, liabilities, or equity\n   - Calculate and interpret key ratios (e.g., current ratio, debt-to-equity)\n\n6. Forward-Looking Statements:\n   - Based on this data, provide 3 key predictions for Q3\n   - Suggest 2-3 strategic moves we should consider to improve our financial position\n\n7. Risk Assessment:\n   - Identify 3 potential financial risks based on this report\n   - Propose mitigation strategies for each risk\n\n8. Peer Comparison:\n   - Compare our performance to 2-3 key competitors (use publicly available data)\n   - Highlight areas where we're outperforming and areas for improvement\n\nPlease use charts or tables where appropriate to visualize data. For any assumptions or interpretations you make, please clearly state them and provide your reasoning.\n\nAfter completing the analysis, please generate 5 potential questions that board members might ask about this report, along with suggested responses.\n\nFinally, summarize this entire analysis into a single paragraph that I can use as an opening statement in the board meeting.",
        whyBetter: "This prompt combines role-playing (as CFO), structured output, specific data analysis requests, predictive analysis, risk assessment, comparative analysis, and even anticipates follow-up questions. It provides a clear framework while encouraging deep analysis and strategic thinking.",
      },
    ],
  },
];
