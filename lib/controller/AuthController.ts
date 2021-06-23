import { Request, Response, NextFunction } from "express";

import passport from "passport";
import jwt from "jsonwebtoken";

import UserDAO from "../dao/UserDAO";
import logger from "../logger";
import DB from "../DB";
import Config from "../Config";
import { UserSigninDTO } from "../dto/UserDTO";
class AuthController {
    public webSignin(req: Request, res: Response, next: NextFunction) {
      passport.authenticate("local", { session: false }, (err, user) => {
        if (err || !user) {
          return res.redirect("/login_failed");
        }

        req.login(user, { session: false }, (err) => {
          if (err) {
            next(err);
          }

          UserDAO.getUserById(user).then((data) => {
            const accessToken = jwt.sign(
              { id: data.id },
              Config.getInstance().server.jwtAccessTokenSecret,
              {
                expiresIn: Config.getInstance().server.jwtAccessTokenExpire,
              }
            );
            const refreshToken = jwt.sign(
              { id: data.id },
              Config.getInstance().server.jwtRefreshTokenSecret,
              {
                expiresIn: Config.getInstance().server.jwtRefreshTokenExpire,
              }
            );

            res.cookie("accessToken", accessToken);
            res.cookie("refreshToken", refreshToken);
            res.redirect("/");
          })
          .catch((err) => {
            res.redirect("/login_failed");
          });
        });
      })(req, res);
    }

    public signin(req: Request, res: Response, next: NextFunction) {
      passport.authenticate("local", { session: false }, (err, user) => {
        if (err || !user) {
          return res.status(400).end();
        }

        req.login(user, { session: false }, (err) => {
          if (err) {
            next(err);
          }

          UserDAO.getUserById(user).then((data) => {
            const accessToken = jwt.sign(
              { id: data.id },
              Config.getInstance().server.jwtAccessTokenSecret,
              {
                expiresIn: Config.getInstance().server.jwtAccessTokenExpire,
              }
            );
            const refreshToken = jwt.sign(
              { id: data.id },
              Config.getInstance().server.jwtRefreshTokenSecret,
              {
                expiresIn: Config.getInstance().server.jwtRefreshTokenExpire,
              }
            );
            const userId = data.id;
            const userName = data.name;
            logger.debug(JSON.stringify(data));
            let result = new UserSigninDTO(
              accessToken,
              refreshToken,
              userId,
              userName
            );
            res.status(200).json(result);
          })
          .catch(() => {
            res.status(400).json();
          });
        });
      })(req, res);
    }

    public refreshToken(req: Request, res: Response, next:NextFunction) {
        passport.authenticate(
        "refresh-jwt",
        { session: false },
        (err, user) => {
            const accessToken = jwt.sign(
            { id: user },
            Config.getInstance().server.jwtAccessTokenSecret,
            {
                expiresIn: Config.getInstance().server
                .jwtAccessTokenExpire,
            }
            );
            res.status(200).json({ accessToken });
        }
        )(req, res);
    }

    public logout(req: Request, res: Response, next:NextFunction) {
        req.logout();
        res.redirect("/");
    }

    public signupProcess(req: Request, res: Response, next:NextFunction) {
        return passport.authenticate(
            "local-signup",
            {
            successRedirect: "/",
            failureRedirect: "/signup",
            failureFlash: true,
            },
            (err, user) => {
            if (user === "1062") {
                res.status(400).json({ ok: false });
            } else {
                res.status(200).json({ ok: true });
            }
            }
        )(req, res);
    }

    public auth(req: Request, res: Response, next:NextFunction) {
        passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureFlash: true,
        })(req, res);
    }
}

export default new AuthController();