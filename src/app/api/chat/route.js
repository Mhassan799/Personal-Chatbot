import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ChatBot from '@/app/models/chatbot'
import mammoth from "mammoth";
import path from 'path';
import ConnectDb from "@/app/lib/db";
import { GoogleGenAI } from "@google/genai";


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const genAI = new GoogleGenerativeAI('AIzaSyBRbpr2dxLOsr-ilyd0XkVKPfvh2kXVl2o');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const Embedingmodel = genAI.getGenerativeModel({ model: 'embedding-001' });
const ai = new GoogleGenAI({});
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

let documentText = ""

let documentChunks = []

async function checking() {

    try {
        const filePath = path.join(process.cwd(), "ProfessionalProfile.docx");
        const result = await mammoth.extractRawText({ path: filePath });
        const chunks = result.value
            .split(/\n/)
            .map(c => c.trim())
            .filter(c => c.length > 20);
        const embRes = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: 'What is the meaning of life?',
        });

        console.log("called", embRes.embeddings);


    } catch (error) {
        console.log('errorrr', error)
    }
}


async function sendDataToVectorDb() {

    const count = await ChatBot.countDocuments()
    console.log('counts', count)
    if (count > 0) return
    console.log('no data found for verctor search')

    try {



        const filePath = path.join(process.cwd(), "ProfessionalProfile.docx");

        const result = await mammoth.extractRawText({ path: filePath });

        const chunks = result.value
            .split(/\n/)
            .map(c => c.trim())
            .filter(c => c.length > 20);

        console.log(`Total chunks: ${chunks.length}`);

        const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: chunks,
            config: { outputDimensionality: 768 }
        });



        console.log('embeddings', response)

        const docs = chunks.map((text, index) => ({
            text,
            embedding: response.embeddings[index].values, // <--- extract the array of numbers
        }));


        // Save all at once
        await ChatBot.insertMany(docs);

        console.log("✅ Data uploaded successfully!");
       

    } catch (error) {
        console.log('error', error)
    }
}


// Load the document when the server starts
const loadDocument = async () => {
    try {
        const result = await mammoth.extractRawText({ path: path.join(__dirname, 'document', 'arabic.docx') });
        documentText = result.value; // Store the text from the .doc file
        console.log('Document loaded successfully!',);

        documentChunks = documentText.split(/\n/)
            // documentChunks = documentText.split(/\n(?=[A-Z].*?:)/)
            // documentChunks = documentText.split(/\n(?=[A-Z].*?:)|\n(?=•)/)
            .map(chunk => chunk.trim())
            .filter(chunk => chunk.length);
        generateEmbeddings();
        console.log('documentChunks', documentChunks)

    } catch (error) {
        console.error('Error loading document:', error);
    }
};

// Call the function to load the document
// loadDocument();


const documentEmbeddings = [];


async function generateEmbeddings() {
    // console.log('documentChunks',documentChunks)
    for (const chunk of documentChunks) {
        // console.log('dekho ')
        // console.log('chunkssssssssss',"chunku",chunk)
        const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' })
        const embeddingResult = await embeddingModel.embedContent(chunk); //gemini embed content function.

        documentEmbeddings.push({
            text: chunk,
            embedding: embeddingResult.embedding.values,
        });
    }
    console.log("Embeddings generated!", documentEmbeddings);

}

async function findRelevantChunks(question) {
    const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
    const questionEmbeddingResult = await embeddingModel.embedContent(question.toLowerCase());
    const questionEmbedding = questionEmbeddingResult.embedding.values;

    function cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length || vecA.length === 0) return 0;

        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            magA += vecA[i] ** 2;
            magB += vecB[i] ** 2;
        }
        const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
        return magnitude > 0 ? dot / magnitude : 0;
    }

    const keywordMatches = (text, question) => {
        const keywords = question.toLowerCase().split(/\s+/);
        return keywords.some((keyword) => text.toLowerCase().includes(keyword)) ? 0.1 : 0;
        // Small boost if the keyword matches
    };

    const similarities = documentEmbeddings
        .map((item) => ({
            text: item.text,
            similarity: cosineSimilarity(questionEmbedding, item.embedding) + keywordMatches(item.text, question),
        }))
        .filter((item) => item.similarity > 0.95);

    // similarities.sort((a, b) => b.similarity - a.similarity);
    console.log('similarities', similarities)
    const topChunks = similarities.slice(0, 5).map((item) => item.text);

    return topChunks;
}

export async function POST(request) {

    await ConnectDb();
    await sendDataToVectorDb();
    try {

        const body = await request.json();

        const { userQuestion } = body;


        const queryEmb = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: userQuestion,
            config: { outputDimensionality: 768 }
        });

        const queryVector = queryEmb.embeddings[0].values;

        const relevantChunks = await ChatBot.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index_1",
                    "path": "embedding",
                    "queryVector": queryVector,
                    "numCandidates": 100,
                    "limit": 5
                }
            }
        ]);

        const context = relevantChunks.map(c => c.text).join("\n\n");

        console.log('relevantChunks',relevantChunks)



        const prompt = `
        Context (English Documents): 
        ${context}

        User Question: 
        ${userQuestion}
        
        Instructions:
        1. Answer the question based ONLY on the provided context inshort.
        2. Important: You must respond in the SAME language as the User Question. 
        3. If the user asks in Urdu, answer in Urdu. If in English, answer in English.
        4. If the answer is not in the context, politely say that you don't have this information in the user's language.
        `;

        // its a prompt

        console.log('prompt',prompt)

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: prompt,
        });
        const responseText = response.text;

        return NextResponse.json({
            answer: responseText,
            success: true
        });

    } catch (error) {
        console.log("error:", error);

        return NextResponse.json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
}