# SD Web UI UX 
A bespoke, highly adaptable, blazing fast user interface for Stable Diffusion, engineered for unmatched user experience and performance.

Compatible with both [Stable Diffusion web UI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and [Stable Diffusion web UI Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) backends.

*This extension performs frontend optimizations **post-DOM load** (modifying elements after they're created), meaning developer tools may show initial resource allocation before optimizations apply. In contrast [Stable Diffusion web UI UX](https://github.com/anapnoe/stable-diffusion-webui-ux) & [Stable Diffusion web UI UX Forge](https://github.com/anapnoe/stable-diffusion-webui-ux-forge) implement **upstream backend optimizations** that prevent unnecessary element creation entirely, enabling faster performance from initialization.*  

[💖 Your Support Makes a Difference! 💖](https://buymeacoffee.com/dayanbayah)

![](/assets/images/anapnoe-ui-ux-flux.png)

## Features Overview
- **Mobile Responsive Design**: Optimal display and usability across various devices.
- **Versatile Micro-Template Engine**: Leverage for enhanced functionality through other extensions.
- **Customizable Theme Styles**: User-friendly interface for theme customization.
- **Styles Manager**: Versatile database-driven styles management.
- **Image Browser**: High-performance database-powered image navigation.
- **Civitai Images**: Ultra-fast virtualized browser for Civitai images.
- **Civitai Models**: Ultra-fast virtualized browser for Civitai models.
- **Built-in Console Log**: Debugging capabilities for developers.
- **Production and Development Modes**: Dynamically compile the web UI UX using Vite directly from the interface.
- **Ignore Overrides Option**: Flexibility to maintain original settings when necessary.
- **Enhanced Usability for Sliders**: Input range sliders support tick marks for improved interaction.
- **Toggle Input Modes**: Switch between slider and numeric input modes for a compact interface.
- **Compatible with Gradio 3 and 4**: Works seamlessly with both Gradio 3 and Gradio 4 frameworks.

### Seamless UI Integration with Extensions
- **Infinite Image Browsing Extension**
- **Deforum Extension**
- **Prompt-All-In-One Extension**
- **Aspect-Ratio-Helper Extension**

## Optimizations
- **Redundant Checkpoints & Extra Networks**: Removed redundant Checkpoints and Extra Networks (Textual Inversion, LoRA, Hypernetworks) from txt2img/img2img tabs. → Implemented single-instance infinite scroll to progressively load optimized assets + metadata from SQLite DB.
- **Inline Event Listeners**: Eradicating inline event listeners from "Extra Networks" cards and action buttons.
- **Event Delegation Pattern**: Applying an event delegation pattern to further streamline the code by consolidating event handling for "Extra Networks" cards and action buttons.
- **Optimized Stylesheets**: Enhanced visual coherence by substituting all default Gradio stylesheets in the DOM with an optimized version.
- **Inline Styles & Svelte Classes**: Improved efficiency by eliminating unnecessary inline styles and Svelte classes.
- **Database-Powered**: SQLite implementation enables rapid indexing/searching across: Extra Networks, Image Browser and Styles Manager.
- **Virtualized Grid**: Dynamic virtualized grid with memory/DOM efficiency for: Checkpoints, Textual Inversions, LoRA, Hypernetworks, Image Browser, Styles Manager, Civitai Images & Models.

### Performance Comparison: UI vs UX
| Core Metrics    | SD web UI  | SD web UI UX | Δ (%)      | Key Improvements |
|-----------------|-----------:|-------------:|-----------:|:-----------------|
| **JS Heap**     | 96,945,380 | 55,048,600   | **-43.2%** | **Memory Efficiency**: 43% ↓ JS heap memory |
| **Documents**   | 109        | 134          | **+22.9%** | **Resource Management**: Optimized overhead |
| **Nodes**       | 53,895     | 41,542       | **-22.9%** | **DOM Efficiency**: 23% ↓ nodes despite 23% ↑ documents |
| **Listeners**   | 8,195      | 4,178        | **-49.0%** | **Event Handling**: 49% ↓ listeners |

| **Visual Comparison** | |
|---|---|
| ![SD web UI](/assets/images/stable-diffusion-webui-insights.png) | ![SD web UI UX](/assets/images/stable-diffusion-webui-ux-insights.png) |
| *Automatic1111 - Stable Diffusion web UI* | *Anapnoe - Stable Diffusion web UI UX* |

### Performance Comparison: Forge vs UX Forge
| Core Metrics    | SD web UI Forge  | SD web UI UX Forge | Δ (%)       | Key Improvements |
|-----------------|-----------------:|-------------------:|------------:|:-----------------|
| **JS Heap**     | 56,121,196       | 45,049,884         | **-19.7%**  | **Memory Efficiency**: 19% ↓ JS heap memory |
| **Documents**   | 21               | 111                | **+428.6%** | **Resource Management**: Optimized overhead |
| **Nodes**       | 46,943           | 43,651             | **-7.0%**   | **DOM Efficiency**: 7% ↓ nodes despite 428% ↑ documents |
| **Listeners**   | 10,562           | 7,495              | **-29.0%**  | **Event Handling**: 29% ↓ listeners |

| **Visual Comparison** | |
|---|---|
| ![SD web UI Forge](/assets/images/stable-diffusion-webui-forge-insights.png) | ![SD web UI UX Forge](/assets/images/stable-diffusion-webui-ux-forge-insights.png) |
| *lllyasviel - Stable Diffusion web UI Forge* | *Anapnoe - Stable Diffusion web UI UX Forge* |
 
⚠️ *Baseline metrics reflect measurements with **all additional webui extensions disabled** - particularly relevant for SD Forge's extensive collection - to ensure balanced comparisons; enabling these extensions raises event listeners beyond 16,000 and introduces significant test-run performance variability.*


### 🚀 Scalable Event Handling & DOM Optimization  
SD webUI UX implements **event delegation** + **virtualized grid** for O(1) performance scaling.

**Stable Diffusion web UI & web UI Forge Constraints**:
- **DOM Bloat**: Loads all assets → 10k LoRAs create 60k+ DOM nodes (10k images + 50k+ container elements)
- **Listener Overload**: ~5 listeners per asset → 50k+ listeners for 10K LoRAs
- **O(n) Scaling**: Linear performance degradation ***(Checkpoints, Textual Inversions, LoRAs, Hypernetworks)***

**Stable Diffusion web UI UX & web UI UX Forge optimized Architecture**:
- **Virtualized Grid**: Renders only visible assets (~15 items in default viewport)  
- **Event Delegation**: Single listener handles all interactions  
- **DOM Recycling**: Dynamic pool manages thumbnail elements  

🎯 **Performance Outcome**:  
- Flat memory profile (≈50MB heap regardless of model assets library size)  
- O(1) event handling complexity  
- Instant scrolling with 100K+ assets   

## Installation
- **Open the Extensions tab in SD-webui.**
- **Select the Install from URL option.**
- **Enter `https://github.com/anapnoe/sd-webui-ux.git`**
- **Click on the Install button.**
- **Wait for the installation to complete and click on Apply and restart UI.**
  
## Todo
- [ ] Separate and organize CSS into individual files (in progress).
- [ ] Create documentation for component integration into UI/UX.
- [ ] Automatically update the Image Browser's SQLite database when files added or removed.
- [ ] Improve Civitai Models download manager.
- [ ] Add virtualization for **Tree View** component.
- [ ] Develop framework-specific npm packages for the UI/UX Dynamic Virtualized Grid component, supporting React, Vue, Svelte, Solid, and Qwik.

## Workspaces UI-UX (in progress)(early access)
The workspaces extension empowers you to create customized views and organize them according to your unique preferences. With an intuitive drag-and-drop interface, you can design workflows that are perfectly tailored to your specific requirements, giving you ultimate control over your work environment.

[🌟 Get early access to Workspaces! 🌟](https://buymeacoffee.com/dayanbayah)

![anapnoe-ui-ux-workspaces](/assets/images/anapnoe-ui-ux-workspaces.png)

## Advanced Theme Style Configurator (in progress)(upcoming)
A sophisticated theme editor allowing you to personalize any aspect of the UI-UX. Tailor the visual experience of the user interface with the Advanced Theme Style configurator.

[🌟 Get early access to Advanced Theme Style Configurator! 🌟](https://buymeacoffee.com/dayanbayah)

![anapnoe-ui-ux-theme-editor-advanced](/assets/images/anapnoe-ui-ux-theme-editor-advanced.png)





