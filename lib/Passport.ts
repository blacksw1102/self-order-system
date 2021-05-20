import passport from "passport";
import passportLocal from "passport-local";
import passportJwt from "passport-jwt";
import UserDAO from "./dao/UserDAO";
import User from "./User";
import { UserDTO } from "./dto/UserDTO";
import Config from "./Config";
import logger from "./logger";

const LocalStrategy = passportLocal.Strategy;
const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;

export default class Passport {
  constructor(passport: passport.PassportStatic) {
    /* 로그인 세션 */
    passport.serializeUser((user, done) => {
      logger.info('SerializeUser - ', user);
      done(null, user);
    });

    passport.deserializeUser((id: string, done) => {
      logger.info("DeserializeUser - ", id);
      UserDAO.getUserById(id).then((data) => {
        done(null, data.id);
      });
    });

    /* 로그인 */
    passport.use(
      new LocalStrategy(
        {
          usernameField: "id",
          passwordField: "pw",
        },
        (username, password, done) => {
          UserDAO.getUserById(username).then((user) => {
            User.comparePassword(password, user.pw, user.salt)
              .then((result) => {
                if (result) {
                  logger.info(`Succeed ${username} Sign in`);
                  return done(null, user.id);
                }
              })
              .catch((err) => {
                logger.info(err);
                logger.info(`[Failed] ${username} : Wrong Password`);
                return done(null, false, { message: "Wrong password" });
              });
          });
        }
      )
    );

    passport.use(
      "refresh-jwt",
      new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: Config.getInstance().server.jwtRefreshTokenSecret,
      },
        (payload, done) => {
          return done(null, payload.id);
        }
      ));

    /* jwt Strategy */
    passport.use(
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          secretOrKey: Config.getInstance().server.jwtAccessTokenSecret,
        },
        (payload, done) => {
          return done(null, payload.id);
          // UserDAO.getUserById(payload.id).then((data) => {
          //   console.log(payload.id);
          //   if (!data) {
          //     return done(null, false);
          //   }

          //   return done(null, data);
          // });
        }
      )
    );

    /* 회원가입 */
    passport.use('local-signup', new LocalStrategy({
      usernameField: 'id',
      passwordField: 'pw',
      passReqToCallback: true
    }, (req, username, password, done) => {
      if (req.body.pw !== req.body.pw2) {
        logger.info(`SIGNUP PW DIFF`);
        return done(null, "1062", { message: "NOT MATCH PW" });
      }
      User.cryptPassword(password).then((cryptResult) => {
        {
          UserDAO.insert(new UserDTO(username, req.body.name, cryptResult[0], cryptResult[1], req.body.tel, "", 0, 0, req.body.birth_date))
            .then(id => {
              return done(null, id);
            })
            .catch(err => {
              if (err) {
                logger.info(
                  `SIGNUP QUERY ERROR ${err.errno}: ${err.sqlMessage}`
                );
                return done(null, "1062", { message: "Duplicate ID" });
              }
            });
        }
      })
    }));
  }
}