export const getGeminiAnalysis = async (regionName, data) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        return "API Key가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가해주세요.";
    }

    const prompt = `
    상권 데이터: ${regionName} (매출 ${(data.revenue / 10000).toFixed(1)}억, 유동인구 ${(data.population / 10000).toFixed(1)}만, 임대료 ${data.rent}만, 점포수 ${data.openings}개).
    
    이 데이터를 바탕으로 이 상권의 특징과 투자 가치를 3~4문장의 줄글로만 간결하게 요약해주세요.
    
    [필수 조건]
    1. 마크다운(##, **, - 등)을 절대 사용하지 마세요. 오직 텍스트로만 작성하세요.
    2. 제목이나 소제목을 달지 말고 바로 본론으로 시작하세요.
    3. "~함", "~음" 대신 "~합니다", "~보입니다"의 정중한 어조를 사용하세요.
    4. 매출과 유동인구의 관계를 분석하여 실속 있는 상권인지 판단해주세요.
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
