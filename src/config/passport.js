import { Strategy } from "passport-local";
import bcrypt from "bcrypt";
import { db } from "./db.js";

export default function (passport) {
    passport.use(new Strategy({
        usernameField: 'email',
        passwordField: 'password'
    },
        async function verify(email, password, cb) {
            try {
                const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
                if (result.rows.length === 0) {
                    return cb(null, false, { message: "Incorrect email or password." });
                }
                const user = result.rows[0];
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return cb(null, false, { message: "Incorrect email or password." });
                }
                return cb(null, user);
            } catch (error) {
                return cb(error);
            }
        }
    ));

    passport.serializeUser((user, cb) => {
        cb(null, user.id);
    });

    passport.deserializeUser(async (id, cb) => {
        try {
            const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
            const user = result.rows[0];
            cb(null, user);
        } catch (error) {
            cb(error);
        }
    });
}