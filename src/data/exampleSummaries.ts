/**
 * Example Research Paper Summaries for Testing
 * These simulate the output from your friend's summarization system
 */

import type { GenerationInput } from "../types/poster";

/**
 * Example 1: Attention Is All You Need (Transformer Paper)
 * Classic ML paper - good for all knowledge levels
 */
export const transformerPaperBeginner: GenerationInput = {
  summary: {
    title: "Attention Is All You Need",
    one_liner: "A new way to help computers understand language by focusing on what matters most",
    key_concepts: [
      {
        name: "Self-Attention",
        explanation: "Instead of reading word by word, the model looks at all words at once and decides which ones are most related to each other",
        visual_metaphor: "spotlight that can shine on multiple actors on stage simultaneously"
      },
      {
        name: "Transformer Architecture",
        explanation: "The overall design that stacks attention layers to build understanding, like floors in a building",
        visual_metaphor: "tower where each floor refines the understanding from below"
      },
      {
        name: "Parallelization",
        explanation: "Processing everything at once instead of one step at a time, making it much faster",
        visual_metaphor: "team of workers all building different parts simultaneously versus one worker doing everything sequentially"
      }
    ],
    key_finding: "Transformers outperform previous models while being faster to train",
    real_world_impact: "This architecture powers ChatGPT, Google Search, and most modern AI systems"
  },
  knowledge_level: "beginner",
  user_preferences: {
    background: "general interest",
    preferred_colors: ["blue", "purple", "green"]
  },
  tags: ["visual", "conceptual"],
  arxiv_id: "1706.03762",
  options: {
    include_layout_previews: false,
    include_variations: false,
    generation_mode: "high_quality"
  }
};

export const transformerPaperIntermediate: GenerationInput = {
  summary: {
    title: "Attention Is All You Need",
    one_liner: "Novel sequence-to-sequence architecture based entirely on attention mechanisms",
    key_concepts: [
      {
        name: "Multi-Head Attention",
        explanation: "Parallel attention mechanisms that learn different representation subspaces, allowing the model to attend to information from different positions",
        visual_metaphor: "multiple parallel processing streams each focusing on different aspects"
      },
      {
        name: "Positional Encoding",
        explanation: "Sinusoidal functions added to embeddings to inject sequence order information, since attention has no inherent notion of position",
        visual_metaphor: "unique timestamp or address given to each word"
      },
      {
        name: "Encoder-Decoder Stack",
        explanation: "Six identical encoder layers and six decoder layers, each with self-attention and feed-forward networks",
        visual_metaphor: "assembly line with specialized stations for processing"
      },
      {
        name: "Scaled Dot-Product Attention",
        explanation: "Attention(Q,K,V) = softmax(QK^T/√d_k)V - efficient computation of attention weights",
        visual_metaphor: "scoring mechanism that weights relevance of different inputs"
      }
    ],
    key_finding: "Achieves 28.4 BLEU on WMT 2014 English-to-German translation, training in 3.5 days on 8 GPUs",
    real_world_impact: "Foundation for BERT, GPT, T5, and virtually all modern NLP models"
  },
  knowledge_level: "intermediate",
  user_preferences: {
    background: "machine learning engineering"
  },
  tags: ["technical", "mathematical"],
  arxiv_id: "1706.03762",
  options: {
    include_layout_previews: true,
    include_variations: true,
    generation_mode: "high_quality"
  }
};

export const transformerPaperAdvanced: GenerationInput = {
  summary: {
    title: "Attention Is All You Need",
    one_liner: "Sequence transduction model based solely on attention mechanisms, dispensing with recurrence and convolutions entirely",
    key_concepts: [
      {
        name: "Scaled Dot-Product Attention",
        explanation: "Attention(Q,K,V) = softmax(QK^T/√d_k)V where Q,K,V ∈ R^(n×d_k). Scaling factor √d_k prevents gradient vanishing for large d_k",
        visual_metaphor: "matrix multiplication followed by softmax normalization"
      },
      {
        name: "Multi-Head Attention",
        explanation: "MultiHead(Q,K,V) = Concat(head_1,...,head_h)W^O where head_i = Attention(QW^Q_i, KW^K_i, VW^V_i). h=8 parallel attention layers with d_k=d_v=d_model/h=64",
        visual_metaphor: "ensemble of attention functions with learned linear projections"
      },
      {
        name: "Positional Encoding",
        explanation: "PE_(pos,2i) = sin(pos/10000^(2i/d_model)), PE_(pos,2i+1) = cos(pos/10000^(2i/d_model)). Allows model to leverage sequence order",
        visual_metaphor: "sinusoidal basis functions encoding absolute positions"
      },
      {
        name: "Layer Normalization & Residual Connections",
        explanation: "LayerNorm(x + Sublayer(x)) applied around each sub-layer. Facilitates gradient flow and enables deep networks (N=6 layers)",
        visual_metaphor: "skip connections with normalization for training stability"
      },
      {
        name: "Training Regime",
        explanation: "Adam optimizer (β₁=0.9, β₂=0.98, ε=10⁻⁹), warmup learning rate schedule, label smoothing (ε_ls=0.1), dropout (P_drop=0.1)",
        visual_metaphor: "carefully tuned optimization hyperparameters"
      }
    ],
    key_finding: "SOTA on WMT 2014 En-De (28.4 BLEU) and En-Fr (41.8 BLEU). Training cost: 12 hours on 8 P100 GPUs for base model, 3.5 days for big model",
    real_world_impact: "Architectural foundation for modern language models with >100B parameters"
  },
  knowledge_level: "advanced",
  user_preferences: {
    background: "PhD researcher in NLP"
  },
  tags: ["mathematical", "technical", "theoretical"],
  arxiv_id: "1706.03762",
  options: {
    include_layout_previews: false,
    include_variations: false,
    generation_mode: "high_quality"
  }
};

/**
 * Example 2: ResNet Paper (Computer Vision)
 */
export const resnetPaperBeginner: GenerationInput = {
  summary: {
    title: "Deep Residual Learning for Image Recognition",
    one_liner: "Teaching very deep neural networks to learn by remembering what they already knew",
    key_concepts: [
      {
        name: "The Degradation Problem",
        explanation: "When neural networks get too deep, they actually perform worse - not because of overfitting, but because they're harder to train",
        visual_metaphor: "telephone game where the message gets more garbled with each person"
      },
      {
        name: "Residual Connections",
        explanation: "Shortcut paths that let information skip layers, making it easier for the network to learn improvements",
        visual_metaphor: "express lane on a highway that bypasses local traffic"
      },
      {
        name: "Identity Mapping",
        explanation: "If a layer doesn't help, it can just copy the input directly through the shortcut, so adding layers never hurts",
        visual_metaphor: "copy-paste option that ensures you never lose your original work"
      }
    ],
    key_finding: "Networks with 152 layers achieved better results than shallower networks, winning ImageNet competition",
    real_world_impact: "ResNets power facial recognition, medical imaging, and most computer vision systems today"
  },
  knowledge_level: "beginner",
  user_preferences: {
    background: "interested in AI and photography"
  },
  tags: ["visual", "conceptual"],
  arxiv_id: "1512.03385",
  options: {
    include_layout_previews: false,
    include_variations: true,
    generation_mode: "high_quality"
  }
};

/**
 * Example 3: GPT Paper (Language Models)
 */
export const gptPaperIntermediate: GenerationInput = {
  summary: {
    title: "Improving Language Understanding by Generative Pre-Training",
    one_liner: "Training language models on massive unlabeled text, then fine-tuning for specific tasks",
    key_concepts: [
      {
        name: "Unsupervised Pre-training",
        explanation: "Training a language model to predict the next word on billions of words from the internet, learning general language understanding",
        visual_metaphor: "learning to read by consuming a huge library before taking any specific exam"
      },
      {
        name: "Task-Specific Fine-tuning",
        explanation: "Taking the pre-trained model and adapting it to specific tasks like classification or question-answering with minimal labeled data",
        visual_metaphor: "general education followed by specialized professional training"
      },
      {
        name: "Transformer Decoder Architecture",
        explanation: "Using only the decoder part of the Transformer with masked self-attention to predict text left-to-right",
        visual_metaphor: "reading text sequentially while building context from what came before"
      },
      {
        name: "Task Reformulation",
        explanation: "Converting different NLP tasks into a single text-to-text format that the model can handle uniformly",
        visual_metaphor: "translating all problems into a common language"
      }
    ],
    key_finding: "Achieved SOTA on 9 out of 12 tasks with minimal task-specific architecture modifications",
    real_world_impact: "Established the pre-train + fine-tune paradigm used by BERT, GPT-2, GPT-3, and beyond"
  },
  knowledge_level: "intermediate",
  user_preferences: {
    background: "ML engineer working on NLP"
  },
  tags: ["technical", "practical"],
  arxiv_id: "1810.04805",
  options: {
    include_layout_previews: true,
    include_variations: false,
    generation_mode: "high_quality"
  }
};

/**
 * Example 4: Diffusion Models (Generative AI)
 */
export const diffusionPaperBeginner: GenerationInput = {
  summary: {
    title: "Denoising Diffusion Probabilistic Models",
    one_liner: "Teaching AI to create images by gradually removing noise, like developing a photo in reverse",
    key_concepts: [
      {
        name: "Forward Diffusion Process",
        explanation: "Gradually adding noise to an image over many steps until it becomes pure random noise",
        visual_metaphor: "watching a clear photo slowly dissolve into TV static"
      },
      {
        name: "Reverse Diffusion Process",
        explanation: "Training a neural network to reverse the noising process, learning to remove noise step by step",
        visual_metaphor: "learning to unscramble a puzzle by watching it get scrambled and memorizing the steps backward"
      },
      {
        name: "Iterative Generation",
        explanation: "Creating new images by starting with pure noise and gradually denoising it to reveal a coherent image",
        visual_metaphor: "sculptor revealing a statue by slowly chipping away marble"
      }
    ],
    key_finding: "Diffusion models can generate high-quality images that rival GANs while being more stable to train",
    real_world_impact: "Powers Stable Diffusion, DALL-E 2, Midjourney, and most modern AI image generators"
  },
  knowledge_level: "beginner",
  user_preferences: {
    background: "digital artist curious about AI"
  },
  tags: ["visual", "conceptual"],
  arxiv_id: "2006.11239",
  options: {
    include_layout_previews: false,
    include_variations: true,
    generation_mode: "high_quality"
  }
};

/**
 * All examples export
 */
export const exampleSummaries = {
  transformerBeginner: transformerPaperBeginner,
  transformerIntermediate: transformerPaperIntermediate,
  transformerAdvanced: transformerPaperAdvanced,
  resnetBeginner: resnetPaperBeginner,
  gptIntermediate: gptPaperIntermediate,
  diffusionBeginner: diffusionPaperBeginner
};

/**
 * Helper to get a random example
 */
export function getRandomExample(): GenerationInput {
  const examples = Object.values(exampleSummaries);
  return examples[Math.floor(Math.random() * examples.length)];
}

/**
 * Helper to get examples by knowledge level
 */
export function getExamplesByLevel(level: "beginner" | "intermediate" | "advanced"): GenerationInput[] {
  return Object.values(exampleSummaries).filter(
    ex => ex.knowledge_level === level
  );
}
