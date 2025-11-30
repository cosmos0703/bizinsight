// YouTube Data Fetcher with Caching

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const CACHE_KEY = 'YOUTUBE_TREND_CACHE';
const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour

export const fetchYouTubeTrending = async (searchQuery = "소자본 창업 아이템") => {
    if (!YOUTUBE_API_KEY) {
        console.warn('YouTube API Key not found');
        return [];
    }

    // Cache Key based on query
    const queryKey = `${CACHE_KEY}_${searchQuery}`;

    // 1. Check Cache
    const cached = localStorage.getItem(queryKey);
    if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_DURATION) {
            console.log('Serving YouTube Trends from Cache');
            return parsed.data;
        }
    }

    // 2. Fetch Fresh Data
    try {
        console.log(`Fetching YouTube for: ${searchQuery}...`);
        const query = encodeURIComponent(searchQuery);
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&order=viewCount&maxResults=5&key=${YOUTUBE_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.items) {
            const formattedData = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                views: 'HOT',
                thumbnail: item.snippet.thumbnails.default.url,
            }));

            // 3. Save to Cache
            localStorage.setItem(queryKey, JSON.stringify({
                timestamp: Date.now(),
                data: formattedData
            }));

            return formattedData;
        }

        return [];
    } catch (error) {
        console.error('YouTube API Error:', error);
        // Optional: Return stale cache if fetch fails
        if (cached) {
            console.warn('Returning stale cache due to API error');
            return JSON.parse(cached).data;
        }
        return [];
    }
};
