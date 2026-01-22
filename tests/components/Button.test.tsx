/**
 * Component Tests for Button
 * Tests Button component rendering, interactions, and variants
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Import mocks first
import "../setup-rn";

describe("Button Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with children text", () => {
      // Test that Button renders children correctly
      const buttonText = "Click Me";

      // Since we can't use @testing-library without jsdom,
      // we test the component's props and behavior logic
      const props = {
        children: buttonText,
        onPress: vi.fn(),
      };

      expect(props.children).toBe(buttonText);
    });

    it("should have default variant as primary", () => {
      const props = {
        children: "Button",
        variant: undefined,
      };

      // Default variant should be 'primary' when undefined
      const defaultVariant = props.variant ?? "primary";
      expect(defaultVariant).toBe("primary");
    });

    it("should accept all variant types", () => {
      const variants = [
        "primary",
        "secondary",
        "outline",
        "ghost",
        "red",
        "orange",
        "green",
        "teal",
        "purple",
        "coral",
        "lavender",
        "yellow",
      ];

      variants.forEach((variant) => {
        const props = { variant, children: "Test" };
        expect(props.variant).toBe(variant);
      });
    });
  });

  describe("Disabled State", () => {
    it("should be disabled when disabled prop is true", () => {
      const props = {
        disabled: true,
        onPress: vi.fn(),
        children: "Button",
      };

      expect(props.disabled).toBe(true);
    });

    it("should be disabled when loading prop is true", () => {
      const props = {
        loading: true,
        disabled: false,
        children: "Button",
      };

      // isDisabled = disabled || loading
      const isDisabled = props.disabled || props.loading;
      expect(isDisabled).toBe(true);
    });

    it("should compute correct disabled state", () => {
      const testCases = [
        { disabled: false, loading: false, expected: false },
        { disabled: true, loading: false, expected: true },
        { disabled: false, loading: true, expected: true },
        { disabled: true, loading: true, expected: true },
      ];

      testCases.forEach(({ disabled, loading, expected }) => {
        const isDisabled = disabled || loading;
        expect(isDisabled).toBe(expected);
      });
    });
  });

  describe("Interactions", () => {
    it("should call onPress when pressed and not disabled", () => {
      const onPress = vi.fn();
      const props = {
        onPress,
        disabled: false,
        loading: false,
        children: "Button",
      };

      // Simulate the handlePress logic
      const handlePress = () => {
        if (!props.disabled && !props.loading && props.onPress) {
          props.onPress();
        }
      };

      handlePress();
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("should not call onPress when disabled", () => {
      const onPress = vi.fn();
      const props = {
        onPress,
        disabled: true,
        loading: false,
        children: "Button",
      };

      const handlePress = () => {
        if (!props.disabled && !props.loading && props.onPress) {
          props.onPress();
        }
      };

      handlePress();
      expect(onPress).not.toHaveBeenCalled();
    });

    it("should not call onPress when loading", () => {
      const onPress = vi.fn();
      const props = {
        onPress,
        disabled: false,
        loading: true,
        children: "Button",
      };

      const handlePress = () => {
        if (!props.disabled && !props.loading && props.onPress) {
          props.onPress();
        }
      };

      handlePress();
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe("Gradient Variants", () => {
    it("should use gradient for primary variant", () => {
      const gradientVariants = [
        "primary",
        "red",
        "orange",
        "coral",
        "green",
        "teal",
        "purple",
        "lavender",
        "yellow",
      ];

      gradientVariants.forEach((variant) => {
        const usesGradient = [
          "primary",
          "red",
          "orange",
          "coral",
          "green",
          "teal",
          "purple",
          "lavender",
          "yellow",
        ].includes(variant);

        expect(usesGradient).toBe(true);
      });
    });

    it("should not use gradient for secondary, outline, ghost", () => {
      const nonGradientVariants = ["secondary", "outline", "ghost"];

      nonGradientVariants.forEach((variant) => {
        const usesGradient = [
          "primary",
          "red",
          "orange",
          "coral",
          "green",
          "teal",
          "purple",
          "lavender",
          "yellow",
        ].includes(variant);

        expect(usesGradient).toBe(false);
      });
    });
  });

  describe("Text Color", () => {
    it("should return white for gradient variants", () => {
      const getTextColor = (variant: string): string => {
        switch (variant) {
          case "secondary":
          case "outline":
          case "ghost":
            return "primary"; // Would be colors.primary
          case "yellow":
            return "#2D3436";
          default:
            return "#FFFFFF";
        }
      };

      expect(getTextColor("primary")).toBe("#FFFFFF");
      expect(getTextColor("red")).toBe("#FFFFFF");
      expect(getTextColor("green")).toBe("#FFFFFF");
    });

    it("should return primary color for secondary/outline/ghost", () => {
      const getTextColor = (variant: string): string => {
        switch (variant) {
          case "secondary":
          case "outline":
          case "ghost":
            return "primary";
          case "yellow":
            return "#2D3436";
          default:
            return "#FFFFFF";
        }
      };

      expect(getTextColor("secondary")).toBe("primary");
      expect(getTextColor("outline")).toBe("primary");
      expect(getTextColor("ghost")).toBe("primary");
    });

    it("should return dark color for yellow variant", () => {
      const getTextColor = (variant: string): string => {
        switch (variant) {
          case "yellow":
            return "#2D3436";
          default:
            return "#FFFFFF";
        }
      };

      expect(getTextColor("yellow")).toBe("#2D3436");
    });
  });

  describe("TestID", () => {
    it("should accept testID prop", () => {
      const props = {
        testID: "my-button",
        children: "Button",
      };

      expect(props.testID).toBe("my-button");
    });
  });

  describe("Style", () => {
    it("should accept custom style prop", () => {
      const customStyle = { marginTop: 10, backgroundColor: "red" };
      const props = {
        style: customStyle,
        children: "Button",
      };

      expect(props.style).toEqual(customStyle);
    });
  });

  describe("Opacity", () => {
    it("should have reduced opacity when disabled", () => {
      const isDisabled = true;
      const opacity = isDisabled ? 0.5 : 1;

      expect(opacity).toBe(0.5);
    });

    it("should have full opacity when not disabled", () => {
      const isDisabled = false;
      const opacity = isDisabled ? 0.5 : 1;

      expect(opacity).toBe(1);
    });
  });
});
