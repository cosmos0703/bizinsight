export const getGeminiAnalysis = async (regionName, data, category = "일반 창업") => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return "API Key가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가해주세요.";
    }

    const prompt = `
    지역: ${regionName}
    희망 업종: ${category}
    상권 데이터: 
    - 월 평균 매출: ${(data.revenue / 10000).toFixed(1)}억원 (점포당 추정)
    - 일일 유동인구: ${(data.population / 10000).toFixed(1)}만명
    - 평당 임대료: ${data.rent}만원
    - 신규 개업 점포 수: ${data.openings}개
    
    이 데이터를 바탕으로 '${category}' 업종을 창업하려는 투자자에게 이 상권의 매력도와 리스크를 분석해주세요.
    
    [필수 조건]
    1. 마크다운(##, **, - 등)을 절대 사용하지 마세요. 오직 줄글(텍스트)로만 작성하세요.
    2. 제목이나 소제목 없이 바로 본론으로 시작하세요.
    3. 3~4문장으로 간결하게 요약하세요.
    4. "~합니다", "~보입니다"의 정중한 어조를 사용하세요.
    5. 매출 규모와 유동인구를 고려하여 해당 업종(${category})에 적합한지 구체적으로 조언해주세요.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const result = await response.json();
        if (result.candidates && result.candidates[0].content) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Gemini API Error:", result);
            return "분석 정보를 가져오는 데 실패했습니다.";
        }
    } catch (error) {
        console.error("Gemini API Request Failed:", error);
        return "AI 분석 중 오류가 발생했습니다.";
    }
};
