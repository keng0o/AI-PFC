import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini APIの設定
// 実際のAPIキーはGoogle AIスタジオから取得する必要があります
const API_KEY = "YOUR_GEMINI_API_KEY";

// APIクライアントの初期化
const genAI = new GoogleGenerativeAI(API_KEY);

// 画像生成用のモデル
const getGeminiProVisionModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-pro-vision" });
};

// テキスト生成用のモデル
const getGeminiProModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-pro" });
};

export { getGeminiProModel, getGeminiProVisionModel };
