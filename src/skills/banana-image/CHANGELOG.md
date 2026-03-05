# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-22

### Added

- Initial release of Banana Image skill
- **Dual model support**: Flash (fast) and Pro (4K high-quality)
- **Image generation** with customizable parameters:
  - Aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4, 4:5, 5:4, 2:3, 3:2, 21:9
  - Resolutions: 1K, 2K, 4K (Pro model only for 4K)
  - Negative prompts for content exclusion
  - Batch generation (1-4 images)
- **Image editing mode** - modify existing images with text prompts
- **Proxy support** via undici for corporate network environments
- **Google Search grounding** for Pro model
- **Template system** with predefined configurations:
  - Product photography
  - Social media posts
  - Posters
  - Thumbnails
- CLI interface with comprehensive options
- JSON output format for easy integration
- Claude Code skill integration

### Technical Details

- Models:
  - Flash: `gemini-2.5-flash-image`
  - Pro: `gemini-3-pro-image-preview`
- Default output: `./images` directory
- Supported input formats: PNG, JPG, JPEG, GIF, WebP
