//Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    author: String,
    publishDate: { type: Date, default: Date.now },
    imageUrl: String, // 存储图片的URL或路径
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
