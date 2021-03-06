const express = require('express')
const router = express.Router()
const mail = require('../email')
const db = require('../db/db.js')

// 发布评论并通知站长和评论者
router.post('/api/comment', (req, res) => {
    db.Comment.findOne({name: req.body.name, articleId: req.body.articleId}, (err, doc) => {
        if (doc && doc.address !== req.body.address) {
            res.status(403).end('用户名已存在')
        } else if(!doc || doc.address === req.body.address) {
            const comment = {
                imgName: req.body.imgName,
                name: req.body.name,
                address: req.body.address,
                date: Date(),
                content: req.body.content,
                articleId: req.body.articleId,
                like: 0
            }
            const content = '评论内容： "' + req.body.content + '"\n评论者：“' + req.body.name + '"\n网址：www.xuhaodong.cn' + req.body.curPath
            if (/^@(.*):/.test(req.body.content)) {
                const reviewer = /^@(.*):/.exec(req.body.content)[1]                // 评论者的名字
                db.Comment.findOne({name: reviewer, articleId: req.body.articleId}, (err, doc) => {
                    const replyEmail = doc.address
                    mail.send(replyEmail, '您在博客有一条新评论', content, res)
                })
            }
            new db.Comment(comment).save().then(() => {
                mail.send('xxxxx@qq.com', '您的博客有一条新评论', content, res)
                res.status(200).send('send email successfully')
            }).catch(err => { console.log(err) })
            db.Article.update({aid: req.body.articleId},{$inc: {comment_n: 1}}, (err, data) => {
                if (err) {
                    console.log(err)
                }
            })
        }
    })
})

// 获取某一篇文章的所有评论
router.get('/api/comments', (req, res) => {
    const articleId = req.query.payload.id
    if (req.query.payload.sort === 'date') {                                // 根据时间排序评论
        db.Comment.find({articleId: articleId}, 'name date content like imgName').sort({date: -1}).exec()
            .then((comments) => {
                res.send(comments)
            })
    } else if (req.query.payload.sort === 'like') {                         // 根据点赞数量排序评论
        db.Comment.find({articleId: articleId}, 'name date content like imgName').sort({like: -1}).exec()
            .then((comments) => {
                res.send(comments)
            })
    } else {                                                                // 根据文章的aid获取所有评论
        db.Comment.find({articleId: articleId}, 'name date content like imgName').exec().then((comments) => {
            res.send(comments)
        })
    }
})

// 更新评论的点赞数
router.patch('/api/comments/:id', (req, res) => {
    const id = req.params.id
    if (req.body.option === 'add') {
        db.Comment.update({_id: id}, {$inc: {like: 1}}, (err, data) => {
            if (err) {
                console.log(err)
            } else {
                res.status(200).send('succeed in updating like')
            }
        })
    } else if (req.body.option === 'drop') {
        db.Comment.update({_id: id}, {$inc: {like: -1}}, (err, data) => {
            if (err) {
            console.log(err)
        } else {
            res.status(200).send('succeed in updating like')
        }})
    }
})

module.exports = router
