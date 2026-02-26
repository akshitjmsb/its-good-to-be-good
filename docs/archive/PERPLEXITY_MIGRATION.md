# Migration from Gemini to Perplexity API

This document outlines the migration from Google Gemini API to Perplexity API.

## Changes Made

1. **New API File**: `src/api/perplexity.ts` replaces `src/api/gemini.ts`
2. **All imports updated**: All components now import from `perplexity` instead of `gemini`
3. **Model names updated**: Changed from `gemini-2.5-flash` to `sonar-pro`
4. **Environment variable**: Changed from `VITE_GEMINI_API_KEY` to `VITE_PERPLEXITY_API_KEY`
5. **Package.json**: Removed `@google/genai` dependency

## Environment Variables

Update your `.env` file:

```bash
# Old (remove)
# VITE_GEMINI_API_KEY=your_gemini_key

# New (add)
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

## API Key

Your Perplexity API key:
```
your_perplexity_api_key_here
```

## Perplexity Models

- `sonar-pro` - Recommended for most use cases (default)
- `sonar` - Alternative model

## API Differences

### Gemini (Old)
- Used `@google/genai` SDK
- Structured schema support
- `responseMimeType: 'application/json'`

### Perplexity (New)
- Uses REST API directly
- JSON mode via `response_format: { type: 'json_object' }`
- Compatible interface maintained for existing code

## Compatibility

The new `perplexity.ts` file maintains the same interface as the old `gemini.ts`, so existing code continues to work without changes. The `ai.models.generateContent()` method works the same way.

## Testing

After updating your environment variable, test the application:
1. Food plan generation
2. Analytics content
3. Exercise plans
4. All modal content

## Old Files

The old `src/api/gemini.ts` file can be deleted once you've verified everything works.

