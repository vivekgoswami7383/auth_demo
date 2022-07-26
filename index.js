const express = require('express');
require('dotenv').config();
const connection = require('./database/config');
const app = express();
const port = process.env.PORT;
const moment = require("moment");
const jwt = require("jsonwebtoken");

app.use(express.json());

app.post("/auth/generate_otp", async (req, res) => {
    try {
        const { email } = req.body
        if(!email){
            return res.status(400).json({
                error: "Email is required",
                success: false
            });
        }
        let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

        if(!email.match(regexEmail)){
            return res.status(400).json({
                error: "Invalid email",
                success: false
            });
        }
        const findUser = `SELECT * FROM users WHERE email = "${email}"`
        connection.query(findUser, (error,user) => {
            if(error){
                return res.status(400).json({
                    error: error.message,
                    success: false
                });
            }else if(!user.length > 0) {
                const addUser = `INSERT INTO users (email) VALUES ("${email}")`
                connection.query(addUser, (error,addeduser) => {
                    if(error){
                        return res.status(400).json({
                            error: error.message,
                            success: false
                        });
                    }
                });
            }
            const otp = Math.floor(1000 + Math.random() * 9000);
            const checkOtpGenerationGap =  `SELECT * FROM users WHERE email = "${email}"`
            connection.query(checkOtpGenerationGap, (error,userData) => {
                if(error){
                    return res.status(400).json({
                        error: error.message,
                        success: false
                    });
                }else{
                    let user = userData[0];
                    const nowDate = new Date();
                    const generationTime = user.otp_generation_gap
                    const duration = Math.floor(((nowDate - new Date(generationTime))/1000)/60);

                    if(user.otp_generation_gap && duration < 1){
                        return res.status(400).json({
                            error: "You can generate new OTP after 1 minute",
                            success: false
                        });
                    }
                    const updateUser = `UPDATE users SET OTP = "${otp}", otp_generation_gap = "${moment(nowDate).format("YYYY-MM-DD HH:mm:ss")}", otp_expire_time = "${moment(nowDate).format("YYYY-MM-DD HH:mm:ss")}"`
                    connection.query(updateUser,async(error) => {
                        if(error){
                            return res.status(400).json({
                                error: error.message,
                                success: false
                            });
                        }
                        return res.status(200).json({
                            data: "Otp sent successfully to your mail",
                            success: true
                        });
                    })
                }
            })
        });
    } catch (error) {
        return res.status(400).json({
            error: error.message,
            success: false
        });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if(!email && !otp){
            return res.status(400).json({
                error: "Email and otp is required",
                success: false
            });
        }
        const findUser = `SELECT * FROM users WHERE email = "${email}"`
        connection.query(findUser, (error,userData) => {
            if(error){
                return res.status(400).json({
                    error: error.message,
                    success: false
                });
            }else if(!userData.length > 0){
                return res.status(400).json({
                    error: "Generate otp for login",
                    success: false
                });
            }else{
                let user = userData[0];
                const nowDate = new Date();
                const otpExpireTime = user.otp_expire_time
                const duration = Math.floor(((nowDate - new Date(otpExpireTime))/1000)/60);
                if(duration > 5){
                    return res.status(400).json({
                        error: "OTP expired, generate otp again",
                        success: false
                    });
                }

                const otpBlockTime = user.otp_block_time
                const BlockTimeDuration = Math.floor(((nowDate - new Date(otpBlockTime))/1000)/60);

                if(user.otp_block_time && BlockTimeDuration < 60){
                    return res.status(400).json({
                        error: "You can login after 1 hour",
                        success: false
                    });
                }

                if(user.otp_attempt == 5){
                    const blockUser = `UPDATE users SET otp_block_time = "${moment(nowDate).format("YYYY-MM-DD HH:mm:ss")}" WHERE email = "${email}"`
                    connection.query(blockUser, (error) => {
                        if(error){
                            return res.status(400).json({
                                error: error.message,
                                success: false
                            });
                        }else{
                            return res.status(400).json({
                                error: "Too many wrong attempt, Your account has been blocked you can login after 1 hour",
                                success: false
                            });
                        }
                    })
                }else{
                    if(otp !== user.otp){
                        let attempt = user.otp_attempt ? user.otp_attempt + 1 : 1
                        const wrongOtp = `UPDATE users SET otp_attempt = "${attempt}" WHERE email = "${email}"`
                        connection.query(wrongOtp, (error) => {
                            if(error){
                                return res.status(400).json({
                                    error: error.message,
                                    success: false
                                });
                            }else{
                                return res.status(400).json({
                                    error: "OTP did not match, try again",
                                    success: false
                                });
                            }
                        })
                    }else{
                        const updateUser = `UPDATE users SET otp_block_time = NULL, otp_attempt = NULL, otp_expire_time = NULL WHERE email = "${email}"`
                        connection.query(updateUser, (error) => {
                            if(error){
                                return res.status(400).json({
                                    error: error.message,
                                    success: false
                                });
                            }else{
                                const tokenSecretKey = process.env.JWTSECRET
                                const token = jwt.sign(user.id,tokenSecretKey);
                                return res.status(200).json({
                                    data: token,
                                    success: true
                                });
                            }
                        });
                    }
                }
            }
        })
    } catch (error) {
        return res.status(400).json({
            error: error.message,
            success: false
        });
    }
});

app.listen(port, () => {
    console.log(`App Running on port ${port}`);
});