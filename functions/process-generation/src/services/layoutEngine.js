/**
 * Layout Intelligence Engine
 * Dynamically calculates optimal layouts based on content complexity
 */

export class LayoutEngine {
    /**
     * Calculate optimal layout based on content and knowledge level
     * @param {number} numConcepts
     * @param {string} knowledgeLevel
     * @param {string[]} tags
     * @returns {Object} LayoutStrategy
     */
    calculateLayout(numConcepts, knowledgeLevel, tags) {
        // Validate inputs
        if (numConcepts < 1 || numConcepts > 10) {
            throw new Error("Number of concepts must be between 1 and 10");
        }

        // Choose layout strategy based on knowledge level
        switch (knowledgeLevel) {
            case "beginner":
                return this.verticalFlowLayout(numConcepts);

            case "intermediate":
                return numConcepts <= 4
                    ? this.gridLayout(numConcepts)
                    : this.fPatternLayout(numConcepts);

            case "advanced":
                return this.academicLayout(numConcepts, tags);

            default:
                return this.verticalFlowLayout(numConcepts);
        }
    }

    /**
     * Vertical flow layout - Best for beginners
     */
    verticalFlowLayout(numConcepts) {
        const headerHeight = 15;
        const footerHeight = 10;
        const availableHeight = 100 - headerHeight - footerHeight;
        const conceptHeight = availableHeight / numConcepts;

        const sections = [
            {
                height_percentage: headerHeight,
                position: { x: "center", y: "0%" },
                content_type: "header",
            },
        ];

        // Add concept sections
        for (let i = 0; i < numConcepts; i++) {
            sections.push({
                height_percentage: conceptHeight,
                position: {
                    x: "center",
                    y: `${headerHeight + i * conceptHeight}%`,
                },
                content_type: "concept",
            });
        }

        // Add connector
        sections.push({
            height_percentage: availableHeight,
            position: { x: "center", y: `${headerHeight}%` },
            content_type: "connector",
        });

        // Add footer
        sections.push({
            height_percentage: footerHeight,
            position: { x: "center", y: `${100 - footerHeight}%` },
            content_type: "footer",
        });

        return {
            type: "vertical_flow",
            sections,
            margins: { top: 5, right: 10, bottom: 5, left: 10 },
            spacing: 2,
        };
    }

    /**
     * Grid layout - Best for intermediate users with 2-4 concepts
     */
    gridLayout(numConcepts) {
        const headerHeight = 20;
        const footerHeight = 12;
        const availableHeight = 100 - headerHeight - footerHeight;

        const columns = numConcepts <= 2 ? numConcepts : 2;
        const rows = Math.ceil(numConcepts / columns);

        const cellWidth = 100 / columns;
        const cellHeight = availableHeight / rows;

        const sections = [
            {
                height_percentage: headerHeight,
                position: { x: "center", y: "0%" },
                content_type: "header",
            },
        ];

        // Add concept sections in grid
        for (let i = 0; i < numConcepts; i++) {
            const row = Math.floor(i / columns);
            const col = i % columns;

            sections.push({
                height_percentage: cellHeight,
                position: {
                    x: `${col * cellWidth + cellWidth / 2}%`,
                    y: `${headerHeight + row * cellHeight}%`,
                },
                content_type: "concept",
            });
        }

        // Add footer
        sections.push({
            height_percentage: footerHeight,
            position: { x: "center", y: `${100 - footerHeight}%` },
            content_type: "footer",
        });

        return {
            type: "grid",
            sections,
            margins: { top: 5, right: 8, bottom: 5, left: 8 },
            spacing: 3,
            grid_columns: columns,
            grid_rows: rows,
        };
    }

    /**
     * F-pattern layout - For intermediate users with 5+ concepts
     */
    fPatternLayout(numConcepts) {
        const headerHeight = 18;
        const footerHeight = 10;
        const availableHeight = 100 - headerHeight - footerHeight;

        const sections = [
            {
                height_percentage: headerHeight,
                position: { x: "center", y: "0%" },
                content_type: "header",
            },
        ];

        // First concept takes full width (horizontal bar of F)
        sections.push({
            height_percentage: availableHeight * 0.25,
            position: { x: "center", y: `${headerHeight}%` },
            content_type: "concept",
        });

        // Remaining concepts in 2-column grid (vertical bar of F)
        const remainingConcepts = numConcepts - 1;
        const rows = Math.ceil(remainingConcepts / 2);
        const cellHeight = (availableHeight * 0.75) / rows;

        for (let i = 0; i < remainingConcepts; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;

            sections.push({
                height_percentage: cellHeight,
                position: {
                    x: col === 0 ? "25%" : "75%",
                    y: `${headerHeight + availableHeight * 0.25 + row * cellHeight}%`,
                },
                content_type: "concept",
            });
        }

        // Add footer
        sections.push({
            height_percentage: footerHeight,
            position: { x: "center", y: `${100 - footerHeight}%` },
            content_type: "footer",
        });

        return {
            type: "f_pattern",
            sections,
            margins: { top: 5, right: 8, bottom: 5, left: 8 },
            spacing: 2.5,
        };
    }

    /**
     * Academic layout - Dense, multi-column for advanced users
     */
    academicLayout(numConcepts, tags) {
        const headerHeight = 15;
        const footerHeight = 8;
        const availableHeight = 100 - headerHeight - footerHeight;

        // Determine if we need diagrams based on tags
        const hasDiagrams = tags.includes("mathematical") || tags.includes("visual");

        const sections = [
            {
                height_percentage: headerHeight,
                position: { x: "center", y: "0%" },
                content_type: "header",
            },
        ];

        if (hasDiagrams && numConcepts >= 4) {
            // Use 2-column layout with diagrams on the right
            const rows = Math.ceil(numConcepts / 2);
            const cellHeight = availableHeight / rows;

            for (let i = 0; i < numConcepts; i++) {
                const row = Math.floor(i / 2);
                const col = i % 2;

                sections.push({
                    height_percentage: cellHeight,
                    position: {
                        x: col === 0 ? "30%" : "70%",
                        y: `${headerHeight + row * cellHeight}%`,
                    },
                    content_type: col === 0 ? "concept" : "diagram",
                });
            }
        } else {
            // Dense vertical stacking
            const conceptHeight = availableHeight / numConcepts;

            for (let i = 0; i < numConcepts; i++) {
                sections.push({
                    height_percentage: conceptHeight,
                    position: { x: "center", y: `${headerHeight + i * conceptHeight}%` },
                    content_type: "concept",
                });
            }
        }

        // Add footer
        sections.push({
            height_percentage: footerHeight,
            position: { x: "center", y: `${100 - footerHeight}%` },
            content_type: "footer",
        });

        return {
            type: "academic",
            sections,
            margins: { top: 4, right: 5, bottom: 4, left: 5 },
            spacing: 1.5,
        };
    }

    /**
     * Get position string for FIBO structured prompt
     */
    getPositionString(section) {
        const vertical =
            section.position.y === "0%"
                ? "top"
                : section.position.y.includes("90") || section.position.y.includes("100")
                    ? "bottom"
                    : "middle";

        const horizontal =
            section.position.x === "center"
                ? "center"
                : parseInt(section.position.x) < 40
                    ? "left"
                    : parseInt(section.position.x) > 60
                        ? "right"
                        : "center";

        return `${vertical}-${horizontal}`;
    }

    /**
     * Calculate optimal font size based on text length and available space
     */
    calculateFontSize(textLength, availableHeight, baseSize = 16) {
        // Reduce font size if text is very long
        if (textLength > 200) {
            return baseSize * 0.75;
        }
        if (textLength > 150) {
            return baseSize * 0.85;
        }
        if (textLength < 50) {
            return baseSize * 1.1;
        }
        return baseSize;
    }

    /**
     * Validate layout strategy
     */
    validateLayout(layout) {
        const errors = [];

        // Check sections
        if (!layout.sections || layout.sections.length === 0) {
            errors.push("Layout must have at least one section");
        }

        // Check total height
        const totalHeight = layout.sections.reduce(
            (sum, section) => sum + section.height_percentage,
            0
        );

        // Allow some tolerance for rounding
        if (Math.abs(totalHeight - 100) > 5) {
            console.warn(
                `Layout sections sum to ${totalHeight}% (expected ~100%)`
            );
        }

        // Check margins
        if (
            layout.margins.top + layout.margins.bottom >= 50 ||
            layout.margins.left + layout.margins.right >= 50
        ) {
            errors.push("Margins are too large (>50% of space)");
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Get layout recommendations based on content
     */
    getLayoutRecommendations(numConcepts, knowledgeLevel, tags) {
        let recommended;
        let alternatives = [];
        let reasoning;

        if (knowledgeLevel === "beginner") {
            recommended = "vertical_flow";
            alternatives = ["grid"];
            reasoning =
                "Vertical flow is easiest to follow for beginners, with clear top-to-bottom progression";
        } else if (knowledgeLevel === "intermediate") {
            if (numConcepts <= 4) {
                recommended = "grid";
                alternatives = ["f_pattern", "vertical_flow"];
                reasoning =
                    "Grid layout allows for easy comparison between concepts for intermediate users";
            } else {
                recommended = "f_pattern";
                alternatives = ["grid", "vertical_flow"];
                reasoning =
                    "F-pattern follows natural eye movement for multiple concepts";
            }
        } else {
            // advanced
            recommended = "academic";
            alternatives = ["grid", "f_pattern"];
            reasoning =
                "Academic layout maximizes information density for advanced users";
        }

        return { recommended, alternatives, reasoning };
    }
}

/**
 * Create a layout engine instance
 */
export function createLayoutEngine() {
    return new LayoutEngine();
}
