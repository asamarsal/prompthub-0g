export interface Artist {
    id: number
    name: string
    handle: string
    avatar: string
    bio: string
    specialties: string[]
    tools: string[]
    rating: number
    reviews: number
    completedProjects: number
    hourlyRate: number
    currency: string
    available: boolean
    verified: boolean
    portfolio: { title: string; image: string; category: string }[]
}

export const artists: Artist[] = [
    {
        id: 1,
        name: "Yuki Tanaka",
        handle: "yukiart",
        avatar: "",
        bio: "Specialist in cinematic photorealistic AI art. I bring brands to life through hyper-detailed visuals crafted with Midjourney and Stable Diffusion.",
        specialties: ["Brand Identity", "Product Photography", "Ad Creative"],
        tools: ["Midjourney v6", "Stable Diffusion XL", "Adobe Firefly"],
        rating: 4.9,
        reviews: 214,
        completedProjects: 87,
        hourlyRate: 0.002,
        currency: "0G",
        available: true,
        verified: true,
        portfolio: [
            { title: "Neon City Campaign", image: "/example/prompt-example-1.png", category: "Ad Creative" },
            { title: "Fantasy Product Shoot", image: "/example/prompt-example-4.png", category: "Product Photography" },
        ],
    },
    {
        id: 2,
        name: "Marcus Chen",
        handle: "marcusgen",
        avatar: "",
        bio: "Award-winning AI director specialising in brand video content and motion graphics. My work blends cyberpunk aesthetics with clean brand language.",
        specialties: ["Video / Motion", "Social Media Pack", "Character Design"],
        tools: ["Sora", "RunwayML", "Midjourney v6"],
        rating: 4.8,
        reviews: 178,
        completedProjects: 65,
        hourlyRate: 0.0035,
        currency: "0G",
        available: true,
        verified: true,
        portfolio: [
            { title: "Web3 Promo Reel", image: "/example/prompt-example-2.jpg", category: "Video" },
            { title: "DeFi Social Pack", image: "/example/prompt-example-3.jpg", category: "Social Media" },
        ],
    },
    {
        id: 3,
        name: "Aisha Patel",
        handle: "aisha3d",
        avatar: "",
        bio: "3D and product visualization expert. I create surreal product renders and packaging designs that stop the scroll.",
        specialties: ["3D Render", "Packaging Design", "NFT Collection"],
        tools: ["Stable Diffusion XL", "Blender + AI", "DALL-E 3"],
        rating: 4.7,
        reviews: 133,
        completedProjects: 52,
        hourlyRate: 0.0025,
        currency: "0G",
        available: false,
        verified: true,
        portfolio: [
            { title: "Luxury Perfume 3D", image: "/example/prompt-example-4.png", category: "3D Render" },
            { title: "Ethereal NFT Drop", image: "/example/prompt-example-1.png", category: "NFT Collection" },
        ],
    },
    {
        id: 4,
        name: "Leo Brandt",
        handle: "leocreates",
        avatar: "",
        bio: "Anime and illustration-style AI artist. Perfect for gaming brands, character-driven campaigns, and manga-inspired content.",
        specialties: ["Character Design", "Game Asset", "Brand Mascot"],
        tools: ["Midjourney v6", "NovelAI", "Adobe Firefly"],
        rating: 4.6,
        reviews: 89,
        completedProjects: 41,
        hourlyRate: 0.0015,
        currency: "0G",
        available: true,
        verified: false,
        portfolio: [
            { title: "Cyber Samurai Mascot", image: "/example/prompt-example-2.jpg", category: "Character Design" },
            { title: "RPG Boss Pack", image: "/example/prompt-example-3.jpg", category: "Game Asset" },
        ],
    },
    {
        id: 5,
        name: "Sofia Ramos",
        handle: "sofiavisuals",
        avatar: "",
        bio: "Minimalist and editorial AI art for fashion and luxury brands. I understand how to make AI feel premium and intentional.",
        specialties: ["Fashion Campaign", "Editorial", "Brand Identity"],
        tools: ["DALL-E 3", "Adobe Firefly", "Midjourney v6"],
        rating: 4.8,
        reviews: 96,
        completedProjects: 38,
        hourlyRate: 0.003,
        currency: "0G",
        available: true,
        verified: true,
        portfolio: [
            { title: "Haute Couture Drop", image: "/example/prompt-example-1.png", category: "Fashion" },
            { title: "Clean Brand Refresh", image: "/example/prompt-example-4.png", category: "Brand Identity" },
        ],
    },
    {
        id: 6,
        name: "Raj Verma",
        handle: "rajtech",
        avatar: "",
        bio: "Tech and fintech visual expert. I build trust through clean, professional AI visuals tailored for B2B and startup brands.",
        specialties: ["Tech Brand", "Infographic", "Ad Creative"],
        tools: ["Stable Diffusion XL", "DALL-E 3", "Canva AI"],
        rating: 4.5,
        reviews: 71,
        completedProjects: 29,
        hourlyRate: 0.0018,
        currency: "0G",
        available: true,
        verified: false,
        portfolio: [
            { title: "SaaS Hero Banner", image: "/example/prompt-example-3.jpg", category: "Tech Brand" },
            { title: "Crypto Exchange UI", image: "/example/prompt-example-2.jpg", category: "Ad Creative" },
        ],
    },
]
