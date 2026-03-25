import mongoose from 'mongoose';

const ChatbotSchema = new mongoose.Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }, // Array of 768 numbers
  
});

export default mongoose.models.Chatbot || mongoose.model('Chatbot', ChatbotSchema);