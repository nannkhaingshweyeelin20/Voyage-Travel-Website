import type { SyntheticEvent } from 'react';
import { detectTravelImageCategory, pickCategoryImage, randomTravelImg, travelImg } from './utils';

type ImageShape = {
  name?: string | null;
  image?: unknown;
  imageUrl?: unknown;
  image_url?: unknown;
  photoUrl?: unknown;
  photo_url?: unknown;
  imageKeyword?: unknown;
  location?: string | null;
  type?: string | null;
  category?: string | null;
  photos?: unknown;
};

function inferImageKeyword(shape: Partial<ImageShape>) {
  return [
    shape.name,
    shape.location,
    shape.type,
    shape.category,
    extractImageCandidate(shape.imageKeyword),
  ].filter(isUsableString).join(' ').trim();
}

function inferElementKeyword(image: HTMLImageElement) {
  return [
    image.dataset.imageKeyword,
    image.dataset.imageCategory,
    image.alt,
    image.getAttribute('aria-label'),
    image.getAttribute('title'),
    image.className,
  ].filter(isUsableString).join(' ').trim();
}

function nextFallbackSource(image: HTMLImageElement) {
  const keyword = inferElementKeyword(image) || 'travel destination';
  const currentSrc = image.currentSrc || image.src || null;
  const attempt = Number(image.dataset.imageFallbackAttempt || '0') + 1;
  image.dataset.imageFallbackAttempt = String(attempt);

  const categoryHint = image.dataset.imageCategory || detectTravelImageCategory(keyword);
  const directCategory = ['beach', 'city', 'hotel', 'restaurant', 'attraction', 'travel'].includes(categoryHint)
    ? categoryHint as 'beach' | 'city' | 'hotel' | 'restaurant' | 'attraction' | 'travel'
    : detectTravelImageCategory(keyword);

  const randomized = randomTravelImg(`${keyword} ${categoryHint}`, attempt, currentSrc);
  if (randomized !== currentSrc) {
    return randomized;
  }

  return pickCategoryImage(directCategory, attempt + 1, currentSrc);
}

function isUsableString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/^(null|undefined)$/i.test(value.trim());
}

function extractImageCandidate(value: unknown): string | null {
  if (isUsableString(value)) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = extractImageCandidate(item);
      if (candidate) return candidate;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = ['image', 'imageUrl', 'image_url', 'photoUrl', 'photo_url', 'url', 'src', 'large', 'medium', 'thumbnail'];
    for (const key of keys) {
      const candidate = extractImageCandidate(record[key]);
      if (candidate) return candidate;
    }
  }

  return null;
}

export function resolvePlaceImage(shape: ImageShape, index = 0): string {
  const direct = extractImageCandidate([
    shape.image,
    shape.imageUrl,
    shape.image_url,
    shape.photoUrl,
    shape.photo_url,
    shape.photos,
  ]);

  if (direct) {
    if (direct.startsWith('http') || direct.startsWith('/') || direct.startsWith('data:') || direct.startsWith('blob:')) {
      return direct;
    }
  }

  const keyword = [inferImageKeyword(shape), direct].filter(isUsableString).join(' ').trim();
  return travelImg(keyword || `${shape.type || shape.category || 'travel'} destination`, index);
}

export function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  image.src = nextFallbackSource(image);
}

function normalizeImageElement(image: HTMLImageElement) {
  const src = image.getAttribute('src')?.trim() || '';
  const keyword = inferElementKeyword(image);
  if (!image.dataset.imageCategory) {
    image.dataset.imageCategory = detectTravelImageCategory(keyword || image.alt || 'travel');
  }
  if (!image.dataset.imageKeyword && keyword) {
    image.dataset.imageKeyword = keyword;
  }
  if (!src || src.startsWith('data:image/svg+xml')) {
    image.src = nextFallbackSource(image);
  }
  if (!image.getAttribute('loading')) {
    image.loading = 'lazy';
  }
  if (!image.style.objectFit) {
    image.style.objectFit = 'cover';
  }
}

export function installGlobalImageFallback() {
  const onError = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement) {
      target.src = nextFallbackSource(target);
    }
  };

  document.addEventListener('error', onError, true);
  Array.from(document.images).forEach(normalizeImageElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          normalizeImageElement(node);
          return;
        }

        if (node instanceof HTMLElement) {
          node.querySelectorAll('img').forEach(normalizeImageElement);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    document.removeEventListener('error', onError, true);
    observer.disconnect();
  };
}