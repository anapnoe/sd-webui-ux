# SD Web UI UX 
A bespoke, highly adaptable, blazing fast user interface for Stable Diffusion, utilizing the powerful [Gradio](https://www.gradio.app/) library. This cutting-edge browser interface offers an unparalleled level of customization and optimization for users, setting it apart from other web interfaces. 

This extension is compatible with both backends: [Stable Diffusion web UI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and [Stable Diffusion web UI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge).

Please note that while this extension focuses solely on frontend optimizations, [Stable Diffusion web UI UX](https://github.com/anapnoe/stable-diffusion-webui-ux), along with its variant [Stable Diffusion web UI UX Forge](https://github.com/anapnoe/stable-diffusion-webui-ux-forge), incorporates backend optimizations for an even better and faster user experience. Together, these changes ensure a more effective and enjoyable interaction with the application.

[🌟 Your Support Makes a Difference! 🌟](https://buymeacoffee.com/dayanbayah)

![](screenshot.png)

## Optimizations
- **Redundant Checkpoints & Extra Networks**: Removing redundant Checkpoints and "Extra Networks" (Textual Inversion, Lora, and Hypernetworks) from img2img to reduce duplicated images and event listeners.
- **Inline Event Listeners**: Eradicating inline event listeners from "Extra Networks" cards and action buttons.
- **Event Delegation Pattern**: Applying an event delegation pattern to further streamline the code by consolidating event handling for "Extra Networks" cards and action buttons.
- **Optimized Stylesheets**: Enhanced visual coherence by substituting all default Gradio stylesheets in the DOM with an optimized version.
- **Inline Styles & Svelte Classes**: Improved efficiency by eliminating unnecessary inline styles and Svelte classes.

## Features Overview
- **Mobile Responsive Design**: Optimal display and usability across various devices.
- **Versatile Micro-Template Engine**: Leverage for enhanced functionality through other extensions.
- **Customizable Theme Styles**: User-friendly interface for theme customization.
- **Built-in Console Log**: Debugging capabilities for developers.
- **Production and Development Modes**: Dynamically compile the web UI UX using Vite directly from the interface.
- **Ignore Overrides Option**: Flexibility to maintain original settings when necessary.
- **Enhanced Usability for Sliders**: Input range sliders support tick marks for improved interaction.
- **Toggle Input Modes**: Switch between slider and numeric input modes for a compact interface.
- **Compatible with Gradio 3 and 4**: Works seamlessly with both Gradio 3 and Gradio 4 frameworks.

## Seamless UI Integration with Extensions
- **Infinite Image Browsing Extension**
- **Deforum Extension**
- **Prompt-All-In-One Extension**
- **Aspect-Ratio-Helper Extension**

## Installation
- **Open the Extensions tab in SD-webui.**
- **Select the Install from URL option.**
- **Enter `https://github.com/anapnoe/sd-webui-ux.git`**
- **Click on the Install button.**
- **Wait for the installation to complete and click on Apply and restart UI.**
  
## Todo
- Separate and organize CSS into individual files (in progress).
- Create documentation for developers on how to incorporate their components into various areas of the UI/UX.
- Implement fullscreen gallery functionality.
- Fork the Gradio project and contribute to enhancing their components.


## Advanced Theme Style Configurator (in progress)(upcoming feature)
A sophisticated theme editor allowing you to personalize any aspect of the UI-UX. Tailor the visual experience of the user interface with the Advanced Theme Style configurator.

[🌟 Get early access to Advanced Theme Style Configurator! 🌟](https://buymeacoffee.com/dayanbayah)

![anapnoe-ui-ux-theme-editor-advanced](https://github.com/anapnoe/sd-webui-ux/blob/main/assets/images/anapnoe-ui-ux-theme-editor-advanced.png)


## Workspaces UI-UX (in progress)(upcoming extension)
The workspaces extension empowers you to create customized views and organize them according to your unique preferences. With an intuitive drag-and-drop interface, you can design workflows that are perfectly tailored to your specific requirements, giving you ultimate control over your work environment.

[🌟 Get early access to Workspaces! 🌟](https://buymeacoffee.com/dayanbayah)

![anapnoe-ui-ux-workspaces](https://github.com/anapnoe/sd-webui-ux/blob/main/assets/images/anapnoe-ui-ux-workspaces.png)


