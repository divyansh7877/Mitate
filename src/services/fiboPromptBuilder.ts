/**
 * FIBO Structured Prompt Builder
 * Transforms summarized content into detailed FIBO structured prompts
 */

import type {
  GenerationInput,
  FiboStructuredPrompt,
  FiboObject,
  FiboTextRender,
  FiboLighting,
  FiboAesthetics,
  FiboPhotographicCharacteristics,
  ColorScheme,
  Typography,
  LayoutStrategy,
  KnowledgeLevel,
  Concept,
} from "../types/poster";

export class FiboStructuredPromptBuilder {
  /**
   * Build complete FIBO structured prompt from input
   */
  build(
    input: GenerationInput,
    layout: LayoutStrategy
  ): FiboStructuredPrompt {
    const colorScheme = this.selectColorScheme(input.knowledge_level);
    const typography = this.selectTypography(input.knowledge_level);

    return {
      short_description: this.generateShortDescription(input, layout),
      objects: this.generateObjects(input, layout, colorScheme),
      background_setting: this.generateBackground(
        colorScheme,
        input.knowledge_level
      ),
      lighting: this.generateLighting(input.knowledge_level),
      aesthetics: this.generateAesthetics(input.knowledge_level, colorScheme),
      photographic_characteristics: this.photoCharacteristics(),
      style_medium: "digital illustration, infographic, educational poster",
      text_render: this.generateTextElements(input, layout, typography),
      context: this.generateContext(input),
      artistic_style: this.selectArtisticStyle(input.knowledge_level),
    };
  }

  /**
   * Generate short description for the entire infographic
   */
  private generateShortDescription(
    input: GenerationInput,
    layout: LayoutStrategy
  ): string {
    const levelDescriptor = {
      beginner:
        "friendly and approachable with simple visual metaphors, suitable for general audience",
      intermediate:
        "professional and technical with diagrams and practical examples, for engineers and practitioners",
      advanced:
        "academic and dense with mathematical notation and detailed methodology, for researchers",
    };

    return `
A HIGH-RESOLUTION, professional-quality educational infographic explaining "${input.summary.title}" from research paper arxiv/${input.arxiv_id}.
The design uses a ${layout.type} layout with ${input.summary.key_concepts.length} main concept sections.
Style is ${levelDescriptor[input.knowledge_level]}.
CRITICAL: This infographic uses OVERLAY TEXT RENDERING - all text elements in text_render array should be treated as vector overlays on top of the background, NOT as diffusion-generated text within the image.
Text must be crystal clear, sharp, and fully legible with high contrast. Use clean vector-style graphics for visual elements with sharp lines and no blurriness.
The background provides visual context, while text_render elements overlay crisp, professional typography.
Overall aesthetic is minimalist, professional, polished, with ample white space around text for maximum readability.
Print-ready quality suitable for sharing on social media or academic presentations.
    `.trim();
  }

  /**
   * Generate all objects for the infographic
   */
  private generateObjects(
    input: GenerationInput,
    layout: LayoutStrategy,
    colorScheme: ColorScheme
  ): FiboObject[] {
    const objects: FiboObject[] = [];

    // Find sections by type
    const headerSection = layout.sections.find((s) => s.content_type === "header");
    const conceptSections = layout.sections.filter(
      (s) => s.content_type === "concept"
    );
    const connectorSection = layout.sections.find(
      (s) => s.content_type === "connector"
    );
    const footerSection = layout.sections.find((s) => s.content_type === "footer");

    // Header object
    if (headerSection) {
      objects.push(
        this.generateHeaderObject(
          input.summary.title,
          input.knowledge_level,
          headerSection,
          colorScheme
        )
      );
    }

    // Concept objects
    input.summary.key_concepts.forEach((concept, idx) => {
      if (conceptSections[idx]) {
        objects.push(
          this.generateConceptObject(
            concept,
            idx,
            input.knowledge_level,
            conceptSections[idx],
            colorScheme
          )
        );
      }
    });

    // Connector objects (for vertical flow)
    if (connectorSection && layout.type === "vertical_flow") {
      objects.push(
        this.generateConnectorObject(
          input.summary.key_concepts.length,
          connectorSection,
          colorScheme
        )
      );
    }

    // Footer object
    if (footerSection) {
      objects.push(
        this.generateFooterObject(
          input.summary.key_finding,
          input.knowledge_level,
          footerSection,
          colorScheme
        )
      );
    }

    return objects;
  }

  /**
   * Generate header object
   */
  private generateHeaderObject(
    title: string,
    level: KnowledgeLevel,
    section: any,
    colorScheme: ColorScheme
  ): FiboObject {
    const iconDescriptor = {
      beginner: "a friendly brain-with-lightbulb icon representing learning and understanding",
      intermediate: "a technical gear-and-circuit icon representing engineering and implementation",
      advanced: "a scholarly book-and-equation icon representing research and academia",
    };

    return {
      description: `Main header banner section containing the title "${title}" in LARGE, BOLD, CRYSTAL-CLEAR typography and ${iconDescriptor[level]}. Ultra-professional design with sharp edges and high contrast that immediately communicates the topic. All text must be perfectly legible and sharp.`,
      location: `top-center, starting at ${section.position.y}`,
      relationship: "Primary visual anchor, introduces the research topic to the viewer",
      relative_size: `${section.height_percentage}% of total vertical space`,
      shape_and_color: `Rounded rectangle banner with smooth gradient from ${colorScheme.primary} to ${colorScheme.secondary}, high contrast with white text`,
      texture: "flat vector-style with subtle gradient, perfectly smooth finish, no artifacts",
      appearance_details: `Razor-sharp edges, modern high-quality sans-serif typography with excellent readability (minimum 18pt equivalent), small decorative pattern (neural network or research-themed) in background at 10% opacity, professional polish`,
      orientation: "horizontal banner spanning full width",
    };
  }

  /**
   * Generate concept object
   */
  private generateConceptObject(
    concept: Concept,
    index: number,
    level: KnowledgeLevel,
    section: any,
    colorScheme: ColorScheme
  ): FiboObject {
    const visualDescription = this.generateConceptVisualDescription(
      concept,
      level
    );

    const containerColors = {
      beginner: ["#F7FAFC", "#EBF8FF", "#F0FFF4", "#FFFAF0"],
      intermediate: ["#EDF2F7", "#E6FFFA", "#FED7E2", "#FAF5FF"],
      advanced: ["#E2E8F0", "#CBD5E0", "#A0AEC0", "#718096"],
    };

    const bgColor =
      containerColors[level][index % containerColors[level].length];

    return {
      description: visualDescription + " All text must be SHARP, CLEAR, and HIGHLY READABLE with excellent contrast. Use professional typography with minimum 14pt equivalent font sizes.",
      location: `${section.position.y} from top, ${section.position.x} horizontally`,
      relationship: `Concept ${index + 1} of ${section.height_percentage}%, sequentially connected to other concepts`,
      relative_size: `${section.height_percentage}% of vertical space`,
      shape_and_color: `Clean rounded container with light background ${bgColor}, high-contrast accent colors from ${colorScheme.accent}, sharp edges`,
      texture: "flat vector illustration style with subtle depth through precise shadows, no blur or artifacts",
      appearance_details: `Large numbered label '${index + 1}' in a circle at top-left with crystal-clear typography, excellent visual hierarchy with sharp text rendering, ${level === "beginner" ? "simple, friendly, and extremely readable" : level === "intermediate" ? "technical, practical, and professionally clear" : "dense, scholarly, but still perfectly legible"}`,
      orientation: "horizontal section with internal layout",
    };
  }

  /**
   * Generate visual description for a concept based on knowledge level
   */
  private generateConceptVisualDescription(
    concept: Concept,
    level: KnowledgeLevel
  ): string {
    if (level === "beginner") {
      return `
Section visualizing "${concept.name}" as a simple metaphor: ${concept.visual_metaphor}.
Use friendly, cartoon-style illustration with clear shapes and bright colors.
The visual should be immediately understandable without technical knowledge.
Include a simple icon or illustration that represents the metaphor visually.
      `.trim();
    }

    if (level === "intermediate") {
      return `
Section explaining "${concept.name}" with technical diagram: ${concept.explanation}.
Show a practical, labeled diagram with components and connections.
Use professional iconography and clean lines to illustrate the concept.
Include arrows, labels, and clear visual flow to show how it works.
      `.trim();
    }

    // advanced
    return `
Section detailing "${concept.name}" with academic precision: ${concept.explanation}.
Include mathematical notation, precise diagrams, and technical specifications.
Use scholarly visual language with charts, graphs, or architectural diagrams.
Show methodology details and technical nuances with annotations.
    `.trim();
  }

  /**
   * Generate connector object for vertical flow layouts
   */
  private generateConnectorObject(
    numConcepts: number,
    section: any,
    colorScheme: ColorScheme
  ): FiboObject {
    return {
      description: `Vertical connecting line with downward-pointing arrows flowing between the ${numConcepts} concept sections, representing logical progression of ideas`,
      location: `center vertically, spanning from first to last concept section`,
      relationship: "Visual flow indicator showing progression through concepts",
      relative_size: "thin vertical element, approximately 2% width",
      shape_and_color: `Dashed line in ${colorScheme.accent} with small arrow heads at each section boundary`,
      texture: "simple line graphic, clean and minimal",
      appearance_details: "Dotted or dashed style at 60% opacity, subtle and not distracting from main content",
      orientation: "vertical",
    };
  }

  /**
   * Generate footer object
   */
  private generateFooterObject(
    keyFinding: string,
    level: KnowledgeLevel,
    section: any,
    colorScheme: ColorScheme
  ): FiboObject {
    return {
      description: `Footer section with key takeaway callout: "${keyFinding}" and source attribution. Professional citation format appropriate for ${level} level.`,
      location: `bottom of infographic, ${section.position.y}`,
      relationship: "Concluding section summarizing the main insight and providing citation",
      relative_size: `${section.height_percentage}% of vertical space`,
      shape_and_color: `Rounded rectangle with background ${colorScheme.primary}, white text for high contrast`,
      texture: "flat, solid color",
      appearance_details: "Contains key finding text prominently displayed, ArXiv citation link in smaller text, small checkmark or star icon as decorative element",
      orientation: "horizontal footer spanning full width",
    };
  }

  /**
   * Generate all text elements
   */
  private generateTextElements(
    input: GenerationInput,
    layout: LayoutStrategy,
    typography: Typography
  ): FiboTextRender[] {
    const textElements: FiboTextRender[] = [];

    // Title - emphasized as OVERLAY text
    textElements.push({
      text: input.summary.title.toUpperCase(),
      location: "top-center",
      size: "large within frame",
      color: "#FFFFFF",
      font: "bold sans-serif",
      appearance_details:
        "OVERLAY TEXT LAYER: Large, bold, all caps title with letter-spacing 0.05em. Render as vector/overlay text on top of background, NOT diffusion-generated. High contrast white text on dark background with crisp edges, anti-aliased for smoothness, sharp rendering with no blurriness or pixelation. Professional typography, maximum readability at 72pt equivalent.",
    });

    // Subtitle
    textElements.push({
      text: input.summary.one_liner,
      location: "top-center, below title",
      size: "medium",
      color: "#FFFFFF",
      font: "sans-serif",
      appearance_details: "OVERLAY TEXT LAYER: Subtitle text rendered as vector overlay, NOT diffusion-generated. Regular weight, sentence case with sharp rendering and anti-aliased edges. High contrast white text with 95% opacity for hierarchy. Clear, crisp typography at 24pt equivalent, no blurriness.",
    });

    // Concept sections
    const conceptSections = layout.sections.filter(
      (s) => s.content_type === "concept"
    );

    input.summary.key_concepts.forEach((concept, idx) => {
      if (conceptSections[idx]) {
        // Concept number and name
        textElements.push({
          text: `${idx + 1}. ${concept.name.toUpperCase()}`,
          location: `left-aligned in section ${idx + 1}`,
          size: "large",
          color: typography.headingColor,
          font: "bold sans-serif",
          appearance_details: "OVERLAY TEXT LAYER: Bold heading text rendered as vector overlay. Numbered for sequence, all caps for emphasis. Render as crisp overlay text with sharp edges and anti-aliasing. High contrast black text on light background at 28pt equivalent. Clear, professional typography with letter-spacing for readability, NO diffusion artifacts.",
        });

        // Truncate very long explanations to avoid FIBO text generation issues
        const truncatedExplanation = concept.explanation.length > 150
          ? concept.explanation.substring(0, 147) + "..."
          : concept.explanation;

        textElements.push({
          text: truncatedExplanation,
          location: `left-aligned in section ${idx + 1}, below heading`,
          size: "medium",
          color: typography.bodyColor,
          font: "sans-serif",
          appearance_details: `OVERLAY TEXT LAYER: Body text rendered as vector overlay with line height 1.6 for readability. Left-aligned, max width 80% of section. Render as sharp overlay text with anti-aliased edges, high contrast gray text on light background at 16pt equivalent. Clear typography with no diffusion artifacts or blurriness. ${this.getExplanationStyle(input.knowledge_level)}`,
        });
      }
    });

    // Key finding - truncate if too long
    const truncatedFinding = input.summary.key_finding.length > 100
      ? input.summary.key_finding.substring(0, 97) + "..."
      : input.summary.key_finding;

    textElements.push({
      text: `KEY INSIGHT: ${truncatedFinding}`,
      location: "bottom-center",
      size: "large",
      color: "#FFFFFF",
      font: "bold sans-serif",
      appearance_details: "OVERLAY TEXT LAYER: Bold callout text rendered as vector overlay. All caps 'KEY INSIGHT' with emphasis. Ultra-high contrast white text on dark background at 20pt equivalent. Render as crisp overlay with anti-aliased edges, sharp and attention-grabbing. NO diffusion artifacts or blurriness.",
    });

    // Citation
    textElements.push({
      text: `Source: arxiv.org/abs/${input.arxiv_id}`,
      location: "bottom-right",
      size: "small",
      color: "#FFFFFF",
      font: "sans-serif",
      appearance_details: "OVERLAY TEXT LAYER: Small caption text rendered as vector overlay at 12pt equivalent. White text with 80% opacity for subtle appearance. Sharp, clear rendering with anti-aliasing. Professional citation format, perfectly readable despite small size. NO blurriness.",
    });

    return textElements;
  }

  /**
   * Calculate dynamic font size based on text length
   */
  private calculateDynamicFontSize(
    text: string,
    level: KnowledgeLevel
  ): string {
    const baseSizes = {
      beginner: 18,
      intermediate: 16,
      advanced: 14,
    };

    let size = baseSizes[level];

    // Reduce size for very long text
    if (text.length > 200) {
      size *= 0.8;
    } else if (text.length > 150) {
      size *= 0.9;
    }

    return `${size}px equivalent in context`;
  }

  /**
   * Get explanation style based on knowledge level
   */
  private getExplanationStyle(level: KnowledgeLevel): string {
    const styles = {
      beginner: "friendly and conversational tone, simple language",
      intermediate: "professional and clear, technical but accessible",
      advanced: "academic and precise, dense information, scholarly tone",
    };
    return styles[level];
  }

  /**
   * Generate background setting
   */
  private generateBackground(
    colorScheme: ColorScheme,
    level: KnowledgeLevel
  ): string {
    if (level === "beginner") {
      return `Clean, crisp white background (${colorScheme.background}) with subtle decorative elements like light dots or abstract shapes at 5% opacity. Bright, welcoming, and PERFECTLY SMOOTH with no artifacts or noise. High-quality flat design.`;
    }

    if (level === "intermediate") {
      return `Professional light gray background (${colorScheme.background}) with subtle grid pattern at 3% opacity. Clean, technical feel with SHARP, PRECISE lines and no blur or distortion. Vector-quality smoothness.`;
    }

    return `Academic off-white background (${colorScheme.background}) with minimal texture. Serious, scholarly appearance with CLEAN, ARTIFACT-FREE rendering. No distractions, perfectly smooth surface.`;
  }

  /**
   * Generate lighting configuration
   */
  private generateLighting(level: KnowledgeLevel): FiboLighting {
    return {
      conditions:
        "Flat, even lighting typical of graphic design and infographics - no dramatic shadows or highlights",
      direction: "Ambient, non-directional, evenly distributed",
      shadows:
        level === "beginner"
          ? "Minimal, only subtle drop shadows on container sections to create slight depth separation"
          : "Very minimal shadows, nearly flat design for professional appearance",
    };
  }

  /**
   * Generate aesthetics configuration
   */
  private generateAesthetics(
    level: KnowledgeLevel,
    colorScheme: ColorScheme
  ): FiboAesthetics {
    const compositions = {
      beginner:
        "Vertical flow layout, top-to-bottom reading order, centered alignment, generous whitespace, 10% margins",
      intermediate:
        "Grid or F-pattern layout, clear visual hierarchy, balanced spacing, 8% margins, efficient use of space",
      advanced:
        "Dense multi-column layout, maximized information density, minimal margins (5%), academic journal style",
    };

    const moods = {
      beginner: "Educational, approachable, friendly, encouraging, inspiring",
      intermediate: "Professional, trustworthy, modern, practical, confident",
      advanced: "Scholarly, authoritative, rigorous, intellectual, serious",
    };

    return {
      composition: compositions[level],
      color_scheme: `Primary: ${colorScheme.primary}, Secondary: ${colorScheme.secondary}, Accent: ${colorScheme.accent}, Background: ${colorScheme.background}, Text: ${colorScheme.text}. Follows WCAG AA accessibility guidelines for contrast.`,
      mood_atmosphere: moods[level],
      preference_score: "very high",
      aesthetic_score: "very high",
    };
  }

  /**
   * Photographic characteristics (optimized for text overlay rendering)
   */
  private photoCharacteristics(): FiboPhotographicCharacteristics {
    return {
      depth_of_field: "Deep focus - all elements sharp from front to back, no blur",
      focus: "Sharp focus on text elements - overlay text must be crystal clear and perfectly legible with no diffusion blur or artifacts",
      camera_angle: "Straight-on, orthographic view, no perspective distortion",
      lens_focal_length: "Standard - no wide-angle or telephoto distortion that affects text readability",
    };
  }

  /**
   * Generate context description
   */
  private generateContext(input: GenerationInput): string {
    const audienceMap = {
      beginner:
        "intelligent adults with no technical background who want to understand influential research",
      intermediate:
        "engineers, practitioners, and ML professionals staying current with research",
      advanced:
        "PhD researchers, academics, and experts doing literature review or deep technical study",
    };

    return `
This is an educational infographic designed for ${audienceMap[input.knowledge_level]}.
The content is based on the research paper "${input.summary.title}" (arXiv:${input.arxiv_id}).
Target use cases: social media sharing (LinkedIn, Twitter), presentations, personal learning, and teaching materials.
The design should be immediately comprehensible, visually appealing, and shareable.
${input.user_preferences?.background ? `The viewer has background in: ${input.user_preferences.background}.` : ""}
    `.trim();
  }

  /**
   * Select artistic style based on knowledge level
   */
  private selectArtisticStyle(level: KnowledgeLevel): string {
    const styles = {
      beginner:
        "minimalist, modern infographic, flat design, friendly illustration, clean vector art, educational, colorful, SHARP LINES, HIGH RESOLUTION, crystal-clear text, professional quality, print-ready",
      intermediate:
        "professional infographic, technical illustration, clean design, modern, engineering-style diagrams, SHARP and PRECISE, high-quality vector graphics, perfectly legible text, polished",
      advanced:
        "academic infographic, scholarly design, precise technical diagrams, mathematical notation, journal-quality, muted colors, ULTRA-SHARP rendering, publication-ready, professional typography",
    };

    return styles[level];
  }

  /**
   * Select color scheme based on knowledge level
   */
  selectColorScheme(level: KnowledgeLevel): ColorScheme {
    const schemes: Record<KnowledgeLevel, ColorScheme> = {
      beginner: {
        primary: "#4299E1", // Bright blue
        secondary: "#9F7AEA", // Purple
        accent: "#48BB78", // Bright green
        background: "#FFFFFF",
        text: "#2D3748",
        light: "#EBF8FF",
        dark: "#2C5282",
      },
      intermediate: {
        primary: "#2C5282", // Professional blue
        secondary: "#2C7A7B", // Teal
        accent: "#D69E2E", // Gold
        background: "#F7FAFC",
        text: "#1A202C",
        light: "#E6FFFA",
        dark: "#1A365D",
      },
      advanced: {
        primary: "#1A365D", // Dark blue
        secondary: "#2D3748", // Dark gray
        accent: "#4A5568", // Medium gray
        background: "#EDF2F7",
        text: "#000000",
        light: "#E2E8F0",
        dark: "#1A202C",
      },
    };

    return schemes[level];
  }

  /**
   * Select typography based on knowledge level
   */
  selectTypography(level: KnowledgeLevel): Typography {
    const base: Record<KnowledgeLevel, Typography> = {
      beginner: {
        titleFont: "bold rounded sans-serif, friendly (similar to Poppins or Nunito)",
        headingFont: "bold sans-serif, clear and friendly",
        bodyFont: "regular sans-serif, highly readable (similar to Inter or Open Sans)",
        titleSize: "48px equivalent in large context",
        subtitleSize: "24px equivalent",
        headingSize: "28px equivalent",
        bodySize: "18px equivalent",
        calloutSize: "20px equivalent",
        captionSize: "14px equivalent",
        headingColor: "#2D3748",
        bodyColor: "#4A5568",
      },
      intermediate: {
        titleFont: "bold sans-serif, professional (similar to Inter or Helvetica Neue)",
        headingFont: "bold sans-serif, clean",
        bodyFont: "regular sans-serif, technical (similar to Inter or Roboto)",
        titleSize: "44px equivalent",
        subtitleSize: "22px equivalent",
        headingSize: "24px equivalent",
        bodySize: "16px equivalent",
        calloutSize: "18px equivalent",
        captionSize: "12px equivalent",
        headingColor: "#1A202C",
        bodyColor: "#2D3748",
      },
      advanced: {
        titleFont: "bold serif or condensed sans-serif, academic (similar to Merriweather or IBM Plex Sans Condensed)",
        headingFont: "bold condensed sans-serif",
        bodyFont: "regular serif or sans-serif, scholarly (similar to Georgia or IBM Plex Sans)",
        titleSize: "40px equivalent",
        subtitleSize: "20px equivalent",
        headingSize: "20px equivalent",
        bodySize: "14px equivalent",
        calloutSize: "16px equivalent",
        captionSize: "11px equivalent",
        headingColor: "#000000",
        bodyColor: "#2D3748",
      },
    };

    return base[level];
  }

  /**
   * Build structured prompt for header section only (modular generation)
   */
  buildHeaderSection(
    input: GenerationInput,
    layout: LayoutStrategy
  ): FiboStructuredPrompt {
    const colorScheme = this.selectColorScheme(input.knowledge_level);
    const headerSection = layout.sections.find((s) => s.content_type === "header");

    return {
      short_description: `Header section of educational infographic for "${input.summary.title}". Clean banner design with title and subtitle text as overlay layers. High contrast, professional typography, minimalist style.`,
      objects: headerSection
        ? [this.generateHeaderObject(input.summary.title, input.knowledge_level, headerSection, colorScheme)]
        : [],
      background_setting: this.generateBackground(colorScheme, input.knowledge_level),
      lighting: this.generateLighting(input.knowledge_level),
      aesthetics: this.generateAesthetics(input.knowledge_level, colorScheme),
      photographic_characteristics: this.photoCharacteristics(),
      style_medium: "digital illustration, infographic header, professional banner",
      text_render: [
        {
          text: input.summary.title.toUpperCase(),
          location: "top-center",
          size: "large within frame",
          color: "#FFFFFF",
          font: "bold sans-serif",
          appearance_details: "OVERLAY TEXT: Large, bold title. Render as crisp vector overlay at 72pt equivalent with high contrast white on dark background. Sharp edges, anti-aliased.",
        },
        {
          text: input.summary.one_liner,
          location: "center, below title",
          size: "medium",
          color: "#FFFFFF",
          font: "sans-serif",
          appearance_details: "OVERLAY TEXT: Subtitle at 24pt equivalent. Sharp, clear rendering with white color at 95% opacity.",
        },
      ],
      context: `Header section for ${input.knowledge_level} level infographic. Focus on clear, readable overlay text.`,
      artistic_style: this.selectArtisticStyle(input.knowledge_level),
    };
  }

  /**
   * Build structured prompt for a single concept section (modular generation)
   */
  buildConceptSection(
    concept: Concept,
    index: number,
    level: KnowledgeLevel,
    layout: LayoutStrategy
  ): FiboStructuredPrompt {
    const colorScheme = this.selectColorScheme(level);
    const typography = this.selectTypography(level);
    const conceptSections = layout.sections.filter((s) => s.content_type === "concept");
    const section = conceptSections[index];

    const truncatedExplanation = concept.explanation.length > 150
      ? concept.explanation.substring(0, 147) + "..."
      : concept.explanation;

    return {
      short_description: `Concept section ${index + 1}: "${concept.name}". Educational infographic section with heading and explanation text as overlay layers. Visual representation of concept with clean typography.`,
      objects: section
        ? [this.generateConceptObject(concept, index, level, section, colorScheme)]
        : [],
      background_setting: this.generateBackground(colorScheme, level),
      lighting: this.generateLighting(level),
      aesthetics: this.generateAesthetics(level, colorScheme),
      photographic_characteristics: this.photoCharacteristics(),
      style_medium: "digital illustration, infographic concept section, educational diagram",
      text_render: [
        {
          text: `${index + 1}. ${concept.name.toUpperCase()}`,
          location: "left-aligned at top",
          size: "large",
          color: typography.headingColor,
          font: "bold sans-serif",
          appearance_details: "OVERLAY TEXT: Bold heading at 28pt equivalent. Sharp, clear black text on light background with high contrast.",
        },
        {
          text: truncatedExplanation,
          location: "left-aligned, below heading",
          size: "medium",
          color: typography.bodyColor,
          font: "sans-serif",
          appearance_details: "OVERLAY TEXT: Body text at 16pt equivalent with line height 1.6. Sharp gray text on light background, max width 80%.",
        },
      ],
      context: `Concept section for ${level} level audience. Emphasize clear, readable overlay text with visual diagram support.`,
      artistic_style: this.selectArtisticStyle(level),
    };
  }

  /**
   * Build structured prompt for footer section only (modular generation)
   */
  buildFooterSection(
    input: GenerationInput,
    layout: LayoutStrategy
  ): FiboStructuredPrompt {
    const colorScheme = this.selectColorScheme(input.knowledge_level);
    const footerSection = layout.sections.find((s) => s.content_type === "footer");

    const truncatedFinding = input.summary.key_finding.length > 100
      ? input.summary.key_finding.substring(0, 97) + "..."
      : input.summary.key_finding;

    return {
      short_description: `Footer section with key insight and citation. Professional callout banner with overlay text for maximum readability.`,
      objects: footerSection
        ? [this.generateFooterObject(input.summary.key_finding, input.knowledge_level, footerSection, colorScheme)]
        : [],
      background_setting: this.generateBackground(colorScheme, input.knowledge_level),
      lighting: this.generateLighting(input.knowledge_level),
      aesthetics: this.generateAesthetics(input.knowledge_level, colorScheme),
      photographic_characteristics: this.photoCharacteristics(),
      style_medium: "digital illustration, infographic footer, professional banner",
      text_render: [
        {
          text: `KEY INSIGHT: ${truncatedFinding}`,
          location: "center",
          size: "large",
          color: "#FFFFFF",
          font: "bold sans-serif",
          appearance_details: "OVERLAY TEXT: Bold callout at 20pt equivalent. High contrast white text on dark background with sharp rendering.",
        },
        {
          text: `Source: arxiv.org/abs/${input.arxiv_id}`,
          location: "bottom-right",
          size: "small",
          color: "#FFFFFF",
          font: "sans-serif",
          appearance_details: "OVERLAY TEXT: Small citation at 12pt equivalent with 80% opacity. Sharp, clear despite small size.",
        },
      ],
      context: `Footer section for ${input.knowledge_level} level infographic. Focus on clear key insight with professional citation.`,
      artistic_style: this.selectArtisticStyle(input.knowledge_level),
    };
  }
}

/**
 * Create a FIBO prompt builder instance
 */
export function createFiboPromptBuilder(): FiboStructuredPromptBuilder {
  return new FiboStructuredPromptBuilder();
}
