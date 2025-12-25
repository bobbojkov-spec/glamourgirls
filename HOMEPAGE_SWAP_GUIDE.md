# Homepage Swap Guide - /front2 to Main Homepage

## Overview
This guide documents the process for promoting `/front2` to become the main homepage (`/`).

## Current Status
- ✅ `/front2` page is production-ready
- ✅ All sections implemented and tested
- ✅ Typography and grid systems locked
- ✅ Mobile-first responsive design complete
- ✅ Accessibility improvements added
- ✅ Error handling production-safe

## Pre-Swap Checklist

### Code Quality
- [x] No console errors in production
- [x] Error logging only in development
- [x] All images have proper alt text
- [x] All interactive elements have focus states
- [x] Proper heading hierarchy (H1 → H2)
- [x] ARIA labels on CTAs and navigation links

### Performance
- [x] Images use lazy loading where appropriate
- [x] Hero image uses eager loading
- [x] Aspect ratios enforced (2:3 for portraits)
- [x] No layout shift from images

### Visual Consistency
- [x] Typography rules consistently applied
- [x] Spacing normalized across sections
- [x] Color usage consistent
- [x] Mobile and desktop layouts verified

## Swap Options

### OPTION A: Direct Replacement (Recommended)
**Steps:**
1. Backup current homepage:
   ```bash
   cp src/app/page.tsx src/app/page.old.tsx
   ```

2. Move front2 to main homepage:
   ```bash
   cp src/app/front2/page.tsx src/app/page.tsx
   ```

3. Update metadata in new homepage (if needed)

4. Test thoroughly on staging/production

5. Archive old homepage:
   ```bash
   mv src/app/page.old.tsx src/app/_archived/page.old.tsx
   ```

**Pros:**
- Clean, permanent change
- No redirect overhead
- SEO-friendly

**Cons:**
- Requires immediate rollback if issues found

### OPTION B: Temporary Redirect (Safer)
**Steps:**
1. Add redirect in `src/app/page.tsx`:
   ```typescript
   import { redirect } from 'next/navigation';
   
   export default function HomePage() {
     redirect('/front2');
   }
   ```

2. Monitor analytics and user feedback

3. Once validated, proceed with Option A

**Pros:**
- Easy rollback
- Can monitor before full commit

**Cons:**
- Redirect adds slight latency
- URL structure changes temporarily

## Post-Swap Tasks

1. **Update Internal Links**
   - Check for any hardcoded `/front2` references
   - Update navigation if needed

2. **SEO Updates**
   - Verify metadata is correct
   - Check canonical URLs
   - Update sitemap if needed

3. **Analytics**
   - Monitor page performance
   - Track user engagement
   - Watch for errors

4. **Cleanup**
   - After validation period, remove `/front2` route
   - Archive old homepage code

## Rollback Plan

If issues are discovered:

**Option A Rollback:**
```bash
cp src/app/_archived/page.old.tsx src/app/page.tsx
```

**Option B Rollback:**
Simply remove the redirect from `src/app/page.tsx`

## Testing Checklist

Before swapping:
- [ ] Desktop (1920px+)
- [ ] Medium desktop (1280px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)
- [ ] All CTAs work
- [ ] Search functionality works
- [ ] Navigation paths intact
- [ ] No console errors
- [ ] Images load correctly
- [ ] Accessibility audit passed

## Notes

- The `/front2` route should remain accessible during transition period
- Consider A/B testing if analytics are set up
- Monitor Core Web Vitals after swap

