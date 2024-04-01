const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
    title: String,
    content: String,
    imageUrl: String,
    date: Date,
    author: String,
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = BlogPost;
