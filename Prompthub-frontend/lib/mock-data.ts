export interface Prompt {
  id: string | number
  contract_id?: number
  title: string
  creator: string
  creatorName: string
  creatorAvatar: string
  price: number
  currency: string
  rating: number
  reviews: number
  sales: number
  license: "Free" | "Commercial" | "Exclusive"
  royalty: number
  tags: string[]
  category: string
  model: string
  createdAt: string
  description: string
  isNsfw: boolean
  isCurated: boolean
  image?: string
}

export const prompts: Prompt[] = [
  {
    id: 1,
    contract_id: 1,
    title: "Photorealistic Portrait Generator",
    creator: "0x1a2b...3c4d",
    creatorName: "AIArtist_Pro",
    creatorAvatar: "",
    price: 0.005,
    currency: "0G",
    rating: 4.8,
    reviews: 127,
    sales: 342,
    license: "Commercial",
    royalty: 5,
    tags: ["portrait", "photorealistic", "midjourney"],
    category: "Image Generation",
    model: "Midjourney v6",
    createdAt: "2026-02-15",
    description: "Generate stunning photorealistic portraits with incredible detail and lifelike skin textures. Perfect for professional photography projects and creative explorations.",
    isNsfw: false,
    isCurated: true,
  },
  {
    id: 2,
    title: "Code Architecture Blueprint",
    creator: "0x5e6f...7g8h",
    creatorName: "DevMaster",
    creatorAvatar: "",
    price: 0.003,
    currency: "0G",
    rating: 4.9,
    reviews: 89,
    sales: 231,
    license: "Commercial",
    royalty: 3,
    tags: ["code", "architecture", "gpt"],
    category: "Code Generation",
    model: "GPT-5",
    createdAt: "2026-02-10",
    description: "Blueprint prompts for generating clean, scalable software architectures. Includes system design, API patterns, and database schemas.",
    isNsfw: false,
    isCurated: true,
  },
  {
    id: 3,
    title: "Fantasy Landscape Creator",
    creator: "0x9i0j...1k2l",
    creatorName: "DreamScapes",
    creatorAvatar: "",
    price: 0.008,
    currency: "0G",
    rating: 4.7,
    reviews: 203,
    sales: 518,
    license: "Exclusive",
    royalty: 10,
    tags: ["fantasy", "landscape", "stable-diffusion"],
    category: "Image Generation",
    model: "Stable Diffusion XL",
    createdAt: "2026-01-28",
    description: "Create breathtaking fantasy landscapes with ethereal lighting, magical elements, and otherworldly atmosphere. Ideal for game art and concept design.",
    isNsfw: false,
    isCurated: false,
  },
  {
    id: 4,
    title: "SEO Blog Writer Pro",
    creator: "0x3m4n...5o6p",
    creatorName: "ContentKing",
    creatorAvatar: "",
    price: 0.002,
    currency: "0G",
    rating: 4.6,
    reviews: 156,
    sales: 445,
    license: "Commercial",
    royalty: 2,
    tags: ["seo", "blog", "content", "gpt"],
    category: "Text Generation",
    model: "GPT-5",
    createdAt: "2026-02-01",
    description: "Generate SEO-optimized blog posts that rank. Includes keyword integration, meta descriptions, and internal linking suggestions.",
    isNsfw: false,
    isCurated: false,
  },
  {
    id: 5,
    title: "Cyberpunk Character Designer",
    creator: "0x7q8r...9s0t",
    creatorName: "NeonArtist",
    creatorAvatar: "",
    price: 0.006,
    currency: "0G",
    rating: 4.9,
    reviews: 312,
    sales: 678,
    license: "Commercial",
    royalty: 7,
    tags: ["cyberpunk", "character", "neon", "midjourney"],
    category: "Image Generation",
    model: "Midjourney v6",
    createdAt: "2026-02-20",
    description: "Design unique cyberpunk characters with neon accents, futuristic gear, and dystopian aesthetics. Perfect for game development and illustration.",
    isNsfw: true,
    isCurated: true,
  },
  {
    id: 6,
    title: "Data Analysis Pipeline",
    creator: "0x1u2v...3w4x",
    creatorName: "DataWizard",
    creatorAvatar: "",
    price: 0.004,
    currency: "0G",
    rating: 4.5,
    reviews: 67,
    sales: 189,
    license: "Free",
    royalty: 0,
    tags: ["data", "analysis", "python", "gpt"],
    category: "Code Generation",
    model: "GPT-5",
    createdAt: "2026-02-18",
    description: "Automated data analysis pipeline prompts. Generate Python scripts for data cleaning, visualization, and statistical analysis.",
    isNsfw: false,
    isCurated: false,
  },
  {
    id: 7,
    title: "Cinematic Scene Composer",
    creator: "0x5y6z...7a8b",
    creatorName: "CinematicAI",
    creatorAvatar: "",
    price: 0.01,
    currency: "0G",
    rating: 5.0,
    reviews: 45,
    sales: 120,
    license: "Exclusive",
    royalty: 12,
    tags: ["cinematic", "scene", "lighting", "midjourney"],
    category: "Image Generation",
    model: "Midjourney v6",
    createdAt: "2026-02-22",
    description: "Compose cinematic scenes with perfect lighting, composition, and atmosphere. Ideal for storyboarding and film pre-visualization.",
    isNsfw: false,
    isCurated: true,
  },
  {
    id: 8,
    title: "UX Copy Generator",
    creator: "0x9c0d...1e2f",
    creatorName: "UXWordsmith",
    creatorAvatar: "",
    price: 0.001,
    currency: "0G",
    rating: 4.4,
    reviews: 234,
    sales: 890,
    license: "Free",
    royalty: 0,
    tags: ["ux", "copy", "microcopy", "gpt"],
    category: "Text Generation",
    model: "GPT-5",
    createdAt: "2026-02-12",
    description: "Generate user-friendly microcopy for buttons, error messages, onboarding flows, and tooltips. Follows UX writing best practices.",
    isNsfw: false,
    isCurated: false,
  },
  {
    id: 9,
    title: "Abstract Art Generator",
    creator: "0x3g4h...5i6j",
    creatorName: "AbstractMinds",
    creatorAvatar: "",
    price: 0.007,
    currency: "0G",
    rating: 4.8,
    reviews: 178,
    sales: 390,
    license: "Commercial",
    royalty: 8,
    tags: ["abstract", "art", "generative", "stable-diffusion"],
    category: "Image Generation",
    model: "Stable Diffusion XL",
    createdAt: "2026-01-25",
    description: "Create mesmerizing abstract art pieces with dynamic colors, forms, and textures. Perfect for digital art collections and NFT projects.",
    isNsfw: true,
    isCurated: false,
  },
]

export const categories = [
  "All Categories",
  "Image Generation",
  "Text Generation",
  "Code Generation",
  "Audio Generation",
  "Video Generation",
]

export const models = [
  "All Models",
  "Midjourney v6",
  "Stable Diffusion XL",
  "GPT-5",
  "DALL-E 4",
  "Claude Opus",
]

export const licenses = ["All Licenses", "Free", "Commercial", "Exclusive"]

export const stats = {
  totalPrompts: "2,847",
  totalCreators: "1,234",
  totalVolume: "42.5 0G",
}

export interface DashboardData {
  totalEarnings: number
  totalSales: number
  activePrompts: number
  averageRating: number
  recentSales: {
    prompt: string
    buyer: string
    price: number
    date: string
    status: "completed" | "pending"
  }[]
  earningsHistory: {
    date: string
    earnings: number
  }[]
}

export const dashboardData: DashboardData = {
  totalEarnings: 1.234,
  totalSales: 156,
  activePrompts: 12,
  averageRating: 4.7,
  recentSales: [
    { prompt: "Photorealistic Portrait Generator", buyer: "0xab12...cd34", price: 0.005, date: "2026-02-28", status: "completed" },
    { prompt: "Code Architecture Blueprint", buyer: "0xef56...gh78", price: 0.003, date: "2026-02-27", status: "completed" },
    { prompt: "Fantasy Landscape Creator", buyer: "0xij90...kl12", price: 0.008, date: "2026-02-27", status: "pending" },
    { prompt: "Cyberpunk Character Designer", buyer: "0xmn34...op56", price: 0.006, date: "2026-02-26", status: "completed" },
    { prompt: "Photorealistic Portrait Generator", buyer: "0xqr78...st90", price: 0.005, date: "2026-02-26", status: "completed" },
    { prompt: "SEO Blog Writer Pro", buyer: "0xuv12...wx34", price: 0.002, date: "2026-02-25", status: "completed" },
  ],
  earningsHistory: [
    { date: "Feb 1", earnings: 0.012 },
    { date: "Feb 5", earnings: 0.025 },
    { date: "Feb 9", earnings: 0.018 },
    { date: "Feb 13", earnings: 0.042 },
    { date: "Feb 17", earnings: 0.035 },
    { date: "Feb 21", earnings: 0.058 },
    { date: "Feb 25", earnings: 0.067 },
    { date: "Feb 28", earnings: 0.045 },
  ],
}

export interface Notification {
  id: number
  type: "purchase" | "review" | "system" | "price-drop"
  title: string
  message: string
  timestamp: string
  read: boolean
}

export const notifications: Notification[] = [
  { id: 1, type: "purchase", title: "New Sale!", message: "Someone purchased your Photorealistic Portrait Generator", timestamp: "2 min ago", read: false },
  { id: 2, type: "review", title: "New Review", message: "AIArtist_Pro received a 5-star review", timestamp: "1 hour ago", read: false },
  { id: 3, type: "system", title: "Platform Update", message: "New licensing options are now available", timestamp: "3 hours ago", read: true },
  { id: 4, type: "price-drop", title: "Price Alert", message: "Cyberpunk Character Designer dropped 20%", timestamp: "5 hours ago", read: true },
]
