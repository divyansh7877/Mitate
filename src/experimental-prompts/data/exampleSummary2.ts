/**
 * Example Research Paper Summaries for Testing - Vision Transformer Edition
 * These simulate the output from a summarization system for the Vision Transformer paper
 * Enhanced with more detailed explanations, additional concepts, and richer metadata to leverage FIBO's structured JSON prompts for higher-quality image generation.
 * More details include expanded real-world impact, additional tags, user preferences with specific style hints, and more granular concept breakdowns to create denser, more precise structured prompts.
 */

import type { GenerationInput } from "../types/poster";

/**
 * Example: Vision Transformer (ViT) Paper - Beginner Level
 * Simplified explanations with visual metaphors for general audience
 */
export const vitPaperBeginner: GenerationInput = {
  summary: {
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    one_liner: "Using language-style AI models to understand pictures by breaking them into small pieces, making image recognition smarter and more efficient",
    key_concepts: [
      {
        name: "Transformers in Vision",
        explanation: "Transformers, which are great at understanding relationships in sequences like words in a sentence, are now used for images by treating them as sequences of small patches",
        visual_metaphor: "Imagine an image as a puzzle where each piece (patch) is a 'word,' and the Transformer is a smart reader that understands how all pieces fit together to describe the whole picture"
      },
      {
        name: "Patches as Words",
        explanation: "An image is divided into a grid of small squares (like 16x16 pixels), and these are flattened into a sequence that the model can process like text",
        visual_metaphor: "Like chopping a photo into tiny tiles and reading them as a story rather than looking at the whole photo at once"
      },
      {
        name: "Pre-training and Transfer",
        explanation: "The model is first trained on huge amounts of images to learn general patterns, then adjusted for specific tasks like identifying objects",
        visual_metaphor: "Like learning a general skill (e.g., language) from reading tons of books before specializing in a job (e.g., writing reports)"
      },
      {
        name: "Vision Transformer (ViT)",
        explanation: "A model that uses self-attention to focus on important relationships between patches without needing traditional image-processing layers",
        visual_metaphor: "Instead of using a magnifying glass to scan local areas, it uses a spotlight that jumps around to connect distant parts of the image"
      },
      {
        name: "Efficiency in Training",
        explanation: "ViT requires less computing power during training compared to older methods, making it easier to build powerful AI for images",
        visual_metaphor: "Like a fuel-efficient car that goes farther on less gas, achieving great results without wasting resources"
      }
    ],
    key_finding: "ViT outperforms traditional methods on benchmarks like ImageNet and CIFAR-100 when trained on large data, with lower training resource needs",
    real_world_impact: "Enables efficient image recognition in everyday apps like photo organization in smartphones, medical image analysis for faster diagnoses, autonomous driving for better object detection, and social media filters, while reducing energy costs in data centers"
  },
  knowledge_level: "beginner",
  user_preferences: {
    background: "general interest in AI and photography",
    preferred_colors: ["blue", "orange", "white"],
    style_hints: "Use bright, engaging colors with simple icons and ample white space for clarity"
  },
  tags: ["visual", "conceptual", "efficient", "scalable"],
  arxiv_id: "2010.11929",
  options: {
    include_layout_previews: true,
    include_variations: true,
    generation_mode: "high_quality"
  }
};

/**
 * Example: Vision Transformer (ViT) Paper - Intermediate Level
 * Technical details for practitioners, with implementation-focused explanations
 */
export const vitPaperIntermediate: GenerationInput = {
  summary: {
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    one_liner: "Applying Transformer architecture directly to image patches for classification, achieving superior results with less computational overhead in pre-training",
    key_concepts: [
      {
        name: "Patch Embedding",
        explanation: "Images are divided into fixed-size patches (e.g., 16x16 pixels), linearly embedded into vectors, and treated as a sequence input to the Transformer encoder, enabling global context modeling via attention",
        visual_metaphor: "Like breaking a photo into puzzle pieces and arranging them in a line, where each piece carries its own information"
      },
      {
        name: "Self-Attention Mechanism",
        explanation: "The core of Transformers, where each patch attends to others to capture dependencies, replacing local convolutions with global interactions for better feature extraction",
        visual_metaphor: "A network of spotlights where each light focuses on related elements across the entire scene, connecting distant parts"
      },
      {
        name: "Pre-training Strategy",
        explanation: "Models are pre-trained on vast unlabeled image datasets (e.g., JFT-300M) to learn general features, then fine-tuned on smaller labeled sets for specific recognition tasks like ImageNet classification",
        visual_metaphor: "Learning a universal language from reading millions of books before specializing in writing poetry or novels"
      },
      {
        name: "Comparison to CNNs",
        explanation: "Traditional CNNs use hierarchical feature extraction with convolutions; ViT applies Transformer layers directly, showing that CNN structure is not essential for strong performance when scaled",
        visual_metaphor: "Replacing a step-by-step assembly line with a collaborative workshop where workers communicate directly"
      },
      {
        name: "Benchmarks and Evaluation",
        explanation: "Evaluated on ImageNet (large-scale classification), CIFAR-100 (small images), and VTAB (transfer across domains), demonstrating robustness and transferability",
        visual_metaphor: "Testing a car's performance on highways, city streets, and off-road tracks to prove its versatility"
      },
      {
        name: "Hybrid Variants",
        explanation: "Optional integration of CNNs for patch extraction in smaller datasets, but pure ViT excels with large-scale pre-training",
        visual_metaphor: "Using training wheels on a bicycle for beginners, but removing them for experienced riders on long journeys"
      }
    ],
    key_finding: "ViT attains state-of-the-art accuracy on multiple benchmarks with fewer FLOPs during training, demonstrating scalability and efficiency gains from Transformer architecture",
    real_world_impact: "Facilitates deployment of high-performance vision models in resource-constrained environments like mobile devices, edge computing for IoT, real-time video analysis in security systems, and scalable cloud-based image processing services"
  },
  knowledge_level: "intermediate",
  user_preferences: {
    background: "machine learning engineering with focus on computer vision",
    preferred_colors: ["navy", "teal", "gray"],
    style_hints: "Incorporate technical diagrams, flowcharts, and labeled components for clarity"
  },
  tags: ["technical", "scalable", "efficient", "transfer-learning"],
  arxiv_id: "2010.11929",
  options: {
    include_layout_previews: true,
    include_variations: true,
    generation_mode: "high_quality"
  }
};

/**
 * Example: Vision Transformer (ViT) Paper - Advanced Level
 * In-depth mathematical and theoretical details for researchers
 */
export const vitPaperAdvanced: GenerationInput = {
  summary: {
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    one_liner: "Pure Transformer applied to sequences of image patches for transduction, achieving competitive performance with reduced training compute via large-scale pre-training",
    key_concepts: [
      {
        name: "Image Patching and Embedding",
        explanation: "An input image I ∈ ℝ^(H × W × C) is divided into N = (H/P) × (W/P) patches of size P × P (e.g., P=16), flattened to vectors x_p, and embedded: x_p = φ(I_p), where φ is a linear projection. The sequence X = [x_1, …, x_N] is augmented with positional embeddings E_pos to preserve spatial order",
        visual_metaphor: "Dissecting a canvas into numbered tiles and arranging them in sequence while preserving their relative positions"
      },
      {
        name: "Transformer Encoder",
        explanation: "Consists of L layers, each with multi-head self-attention and feed-forward networks. Self-attention: Attention(Q, K, V) = softmax(QK^T / √d_k) V, where Q = XW_Q, K = XW_K, V = XW_V, and d_k is the key dimension. Multi-head: MultiHead(Q, K, V) = Concat(head_1, …, head_h) W_O",
        visual_metaphor: "A multi-layered parliament where representatives from different regions debate and vote on relationships, building consensus through iterative discussions"
      },
      {
        name: "Classification Head",
        explanation: "A [CLS] token or global average pooling (GAP) aggregates features for the final linear layer: y = softmax(W · agg(Transformer(X))), where agg is either [CLS] pooling or GAP",
        visual_metaphor: "A final judge who synthesizes all arguments from the debate into a single verdict"
      },
      {
        name: "Pre-training and Fine-Tuning",
        explanation: "Pre-trained on large corpora (e.g., JFT-300M) using cross-entropy loss, then transferred and fine-tuned on downstream tasks with techniques like Mixup or CutMix for regularization",
        visual_metaphor: "Training an athlete on a general fitness regimen before specializing in a specific sport with targeted drills"
      },
      {
        name: "Efficiency Metrics",
        explanation: "Training FLOPs are lower due to absence of convolutional operations, with empirical comparisons showing reduced exaFLOPs while maintaining or exceeding accuracy on benchmarks",
        visual_metaphor: "A fuel-efficient engine that achieves the same speed and distance with less gasoline consumption"
      },
      {
        name: "Inductive Biases",
        explanation: "ViT lacks CNN's translation invariance and locality, relying on data scale to learn these; analysis shows emergence of similar patterns in attention maps",
        visual_metaphor: "A blank-slate learner who discovers fundamental rules of physics through observation rather than being born with them"
      }
    ],
    key_finding: "ViT matches or exceeds CNN performance (e.g., ResNet) on benchmarks with scalable pre-training, highlighting Transformers' viability for vision without hybrid designs",
    real_world_impact: "Lowers barriers for vision AI in research (e.g., scalable experiments) and industry (e.g., efficient models for satellite imagery analysis, medical diagnostics, and large-scale data processing in hyperscale computing)"
  },
  knowledge_level: "advanced",
  user_preferences: {
    background: "PhD researcher in computer vision and deep learning",
    preferred_colors: ["black", "white", "blue-gray"],
    style_hints: "Include mathematical equations, detailed diagrams, and annotations for precision"
  },
  tags: ["mathematical", "theoretical", "scalable", "inductive-bias"],
  arxiv_id: "2010.11929",
  options: {
    include_layout_previews: false,
    include_variations: false,
    generation_mode: "high_quality"
  }
};

/**
 * All ViT examples export
 */
export const vitExampleSummaries = {
  vitBeginner: vitPaperBeginner,
  vitIntermediate: vitPaperIntermediate,
  vitAdvanced: vitPaperAdvanced
};

/**
 * Helper to get a random ViT example
 */
export function getRandomVitExample(): GenerationInput {
  const examples = Object.values(vitExampleSummaries);
  return examples[Math.floor(Math.random() * examples.length)];
}

/**
 * Helper to get ViT examples by knowledge level
 */
export function getVitExamplesByLevel(level: "beginner" | "intermediate" | "advanced"): GenerationInput[] {
  return Object.values(vitExampleSummaries).filter(
    ex => ex.knowledge_level === level
  );
}