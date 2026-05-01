export interface Contest {
    id: number
    title: string
    brand: string
    brandLogo: string
    description: string
    brief: string
    prizePool: number
    currency: string
    prizes: { place: string; amount: number }[]
    category: string
    tags: string[]
    deadline: string
    submissionCount: number
    status: "active" | "judging" | "ended"
    featured: boolean
    image: string
}

export const contests: Contest[] = [
    {
        id: 1,
        title: "Neon Horizon — Brand Visual Identity",
        brand: "NeonX Labs",
        brandLogo: "",
        description: "We're a Web3 gaming studio launching our new IP, Neon Horizon. We need a signature visual identity — think cyberpunk meets anime, bold neon palette, and futuristic typography feel.",
        brief: "Create a hero visual (1920×1080) that encapsulates the Neon Horizon brand universe. Must include: a central character silhouette, neon cityscape, and the text 'NEON HORIZON' styled to match the world.",
        prizePool: 0.5,
        currency: "0G",
        prizes: [
            { place: "1st Place", amount: 0.25 },
            { place: "2nd Place", amount: 0.15 },
            { place: "3rd Place", amount: 0.07 },
            { place: "Honorable Mention ×3", amount: 0.01 },
        ],
        category: "Brand Visual Identity",
        tags: ["cyberpunk", "gaming", "anime", "neon"],
        deadline: "2026-03-25",
        submissionCount: 42,
        status: "active",
        featured: true,
        image: "/example/prompt-example-1.png",
    },
    {
        id: 2,
        title: "0GBrew — Product Launch Campaign",
        brand: "0GBrew Coffee",
        brandLogo: "",
        description: "0GBrew is the world's first 0G-native coffee brand. We're launching our limited edition 0G Roast and need campaign visuals that blend coffee culture with Web3 aesthetics.",
        brief: "Create 3 social media visuals (1:1 format) for our 0G Roast launch. Mood: warm, premium, with subtle 0G/blockchain motifs. No text required — visuals only.",
        prizePool: 0.3,
        currency: "0G",
        prizes: [
            { place: "1st Place", amount: 0.15 },
            { place: "2nd Place", amount: 0.09 },
            { place: "3rd Place", amount: 0.06 },
        ],
        category: "Product Launch Campaign",
        tags: ["coffee", "0g", "lifestyle", "product"],
        deadline: "2026-03-20",
        submissionCount: 28,
        status: "active",
        featured: false,
        image: "/example/prompt-example-2.jpg",
    },
    {
        id: 3,
        title: "DreamDAO — NFT Character Design Challenge",
        brand: "DreamDAO",
        brandLogo: "",
        description: "DreamDAO is launching a 10,000-piece PFP NFT collection. We need a signature character — our 'Dreamer' — that will define the collection's visual identity.",
        brief: "Design the base Dreamer character: humanoid, expressive, Web3-native aesthetic. Must be adaptable for trait variation. Deliverable: full body + portrait crop.",
        prizePool: 0.8,
        currency: "0G",
        prizes: [
            { place: "1st Place", amount: 0.4 },
            { place: "2nd Place", amount: 0.22 },
            { place: "3rd Place", amount: 0.1 },
            { place: "Runners Up ×4", amount: 0.02 },
        ],
        category: "NFT Collection Design",
        tags: ["nft", "character", "pfp", "dao"],
        deadline: "2026-04-01",
        submissionCount: 67,
        status: "active",
        featured: true,
        image: "/example/prompt-example-3.jpg",
    },
    {
        id: 4,
        title: "BitFit — Fitness App Social Media Challenge",
        brand: "BitFit",
        brandLogo: "",
        description: "BitFit rewards workout streaks with 0G. We need energetic, motivational social media content that connects fitness with crypto culture.",
        brief: "Create 1 hero social media post (1080×1080) showing the connection between physical achievement and 0G reward. Energetic, vibrant, human-centered.",
        prizePool: 0.15,
        currency: "0G",
        prizes: [
            { place: "1st Place", amount: 0.08 },
            { place: "2nd Place", amount: 0.04 },
            { place: "3rd Place", amount: 0.03 },
        ],
        category: "Social Media Challenge",
        tags: ["fitness", "0g", "health", "motivation"],
        deadline: "2026-03-18",
        submissionCount: 19,
        status: "judging",
        featured: false,
        image: "/example/prompt-example-4.png",
    },
]
