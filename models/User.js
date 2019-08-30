const bcrypt = require('bcryptjs')
const validator = require('validator')
const usersCollection = require('../db').db().collection('users')
const md5 = require('md5')



let User = function (data, getAvatar) {
    this.userdata = data
    this.errors = []
    if (getAvatar == undefined) { getAvatar = false }
    if (getAvatar) { this.getAvatar() }
}

User.prototype.cleanUp = function () {
    if (typeof (this.userdata.username) != 'string') {
        this.userdata.username = ''
    }
    if (typeof (this.userdata.email) != 'string') {
        this.userdata.email = ''
    }
    if (typeof (this.userdata.password) != 'string') {
        this.userdata.password = ''
    }

    // Get rid of any bogus properties

    this.userdata = {
        username: this.userdata.username.trim().toLowerCase(),
        email: this.userdata.email.trim().toLowerCase(),
        password: this.userdata.password
    }
}

User.prototype.validate = function () {
    return new Promise(async (resolve, reject) => {
        if (this.userdata.username == '') {
            this.errors.push('You must provide a username')
        }
        if (this.userdata.username != '' && !validator.isAlphanumeric(this.userdata.username)) {
            this.errors.push('Username can only contain letters and numbers')
        }
        if (!validator.isEmail(this.userdata.email)) {
            this.errors.push('You must provide a valid email address')
        }
        if (this.userdata.password == '') {
            this.errors.push('You must provide a password')
        }
        if (this.userdata.password.length > 0 && this.userdata.password.length < 8) {
            this.errors.push('Password must be at least 8 characters')
        }
        if (this.userdata.password.length > 50) {
            this.errors.push('Password cannot exceed 50 characters')
        }
        if (this.userdata.username.length > 0 && this.userdata.username.length < 3) {
            this.errors.push('Username must be at least 3 characters')
        }
        if (this.userdata.username.length > 30) {
            this.errors.push('Username cannot exceed 30 characters')
        }
        //Only if username is valid then check to see if it's already taken

        if (this.userdata.username.length > 3 && this.userdata.username.length < 31 && validator.isAlphanumeric(this.userdata.username)) {
            let userNameExists = await usersCollection.findOne({ username: this.userdata.username })
            if (userNameExists) { this.errors.push('Username is already taken') }
        }

        //Only if email is valid then check to see if it's already taken

        if (validator.isEmail(this.userdata.email)) {
            let emailExists = await usersCollection.findOne({ email: this.userdata.email })
            if (emailExists) { this.errors.push('Email is already taken') }
        }
        resolve()
    })
}


User.prototype.login = function () {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        usersCollection.findOne({ username: this.userdata.username }).then((attemptedUser) => {
            if (attemptedUser && bcrypt.compareSync(this.userdata.password, attemptedUser.password)) {
                this.userdata = attemptedUser
                this.getAvatar()
                resolve('congrats')
            } else {
                reject('Invalid username / password')
            }
        })
            .catch(function () {
                reject('Please try again later.')
            })
    })
}


User.prototype.register = function () {
    return new Promise(async (resolve, reject) => {
        //Step 1: Validate user data
        this.cleanUp()
        await this.validate()

        //Step 2: Only if there are no validation errors then save the user data into database.
        if (!this.errors.length) {
            //hash user password
            let salt = bcrypt.genSaltSync(10)
            this.userdata.password = bcrypt.hashSync(this.userdata.password, salt)
            await usersCollection.insertOne(this.userdata)
            this.getAvatar()
            resolve()
        } else {
            reject(this.errors)
        }
    })
}


User.prototype.getAvatar = function () {
    this.avatar = `https://gravatar.com/avatar/${md5(this.userdata.email)}?s=128`
}

User.findByUsername = function (username) {
    return new Promise(function (resolve, reject) {
        if (typeof (username) != 'string') {
            reject()
            return
        }
        usersCollection.findOne({ username: username })
            .then(function (userDoc) {
                if (userDoc) {
                    userDoc = new User(userDoc, true)
                    userDoc = {
                        _id: userDoc.userdata._id,
                        username: userDoc.userdata.username,
                        avatar: userDoc.avatar
                    }
                    resolve(userDoc)
                } else {
                    reject()
                }
            })
            .catch(function () {
                reject()
            })
    })
}

module.exports = User;