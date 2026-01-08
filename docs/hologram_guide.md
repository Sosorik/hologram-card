# Holographic Card Asset Guide

This guide explains how to create custom assets for the Holographic Card Editor.

## 1. Hologram Maps (Reflection Gradients)

The "Hologram Map" defines the color spectrum of the holographic reflection.

*   **Format**: JPG or PNG (smaller is better).
*   **Dimensions**: Recommended 500x500px or larger.
*   **How it works**:
    *   The image is used as the background of the `card__shine` layer.
    *   The "Hologram Texture" (mask) reveals parts of this image based on the viewing angle.
*   **Creating a Custom Map**:
    *   Create a gradient that represents the colors you want to see.
    *   **Rainbow**: Standard full-spectrum gradient.
    *   **Linear**: Simple 2-color or 3-color gradient (e.g., Gold to White).
    *   **Abstract**: Swirly or patterned colors for unique effects.

## 2. Emboss Textures (Height Maps)

The "Embossing" feature (formerly Hologram Texture) creates a physical paper relief effect.

*   **Format**: PNG or JPG (Greyscale).
*   **Dimensions**: Seamless patterns work best (256x256px or 512x512px).
*   **How it works**:
    *   **White areas**: Appear "High" (Raised).
    *   **Black areas**: Appear "Low" (Recessed).
    *   The system uses `mix-blend-mode: hard-light` to simulate highlights and shadows based on this map.
*   **Creating a Custom Texture**:
    *   Find or create a seamless pattern (e.g., leather, linen, concrete).
    *   Convert to Greyscale.
    *   Increase contrast so the highlights are bright white and shadows are deep black.

## 3. Back Masks

The "Back Mask" controls where your uploaded back image appears.

*   **Format**: PNG with Transparency (Alpha) or Black/White (Luminance).
*   **Dimensions**: Should match the card aspect ratio (e.g., 640x880px for 2x scale).
*   **How it works**:
    *   **White/Opaque**: The back image is **VISIBLE**.
    *   **Black/Transparent**: The back image is **HIDDEN** (revealing the card base color).
*   **Use Case**:
    *   If you want a custom frame on the back where the image only shows in the center oval, upload a mask that is black on the edges and white in the center.
