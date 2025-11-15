import { db } from "../config/db.js";
import bcrypt from "bcrypt";
import passport from "passport";

const saltRounds = 10;

export const getLogin = (req, res) => {
    res.render("login.ejs", { error: null });
};

export const postLogin = (req, res, next) => {
    passport.authenticate("local", (error, user, info) => {
        if(error) return next(error);
        if(!user) {
            return res.status(401).render("login.ejs", { error: info.message });
        }
        req.login(user, async (error) => {
            if (error) return next(error);
            await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);
            return res.redirect("/");
        });
    })(req, res, next);
};

export const getLogout = (req, res, next) => {
    req.logout(function(error) {
        if (error) return next(error);
        res.redirect("/login");
    });
};

export const getCreateAccount = (req, res) => {
    res.render("createAccount.ejs", { error: null });
};

export const postCreateAccount = async (req, res) => {
    const { username, email, fPassword, lPassword } = req.body;
    
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (req.body.email.length > 50 || req.body.username.length > 50) {
            return res.status(400).render("createAccount.ejs", { error: "Too much characters." });
        }
        if (result.rows.length > 0) {
            return res.status(409).render("createAccount.ejs", { error: "Email is already in use." });
        }
        if (fPassword !== lPassword) {
            return res.status(422).render("createAccount.ejs", { error: "Passwords do not match." });
        }

        const hashedPassword = await bcrypt.hash(fPassword, saltRounds);
        await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3);",
            [username, email, hashedPassword]
        );
        res.redirect("/login");

    } catch (error) {
        console.error("Error creating account:", error);
        res.status(500).render("createAccount.ejs", { error: "Something went wrong." });
    }
};