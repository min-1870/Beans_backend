import express, { json, Request, Response } from 'express';
import { echo } from './echo';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import { channelsCreateV1, channelsListAllV1, channelsListV1 } from './channels';
import { getAuthUserIdFromToken, removetoken } from './utils';
import { clearV1 } from './other';
import { authLoginV1, authRegisterV1, sendPasswordResetEmail } from './auth';
import { userProfileEmailChange, userProfileHandleChange, userProfileNameChange, userProfileV1, listAllUsersV1 } from './users';
import {
  authRegisterRequest,
  authLoginRequest,
  channelMessagesRequest,
  channelsCreateRequest,
  channelsListRequest,
  channelsListAllRequest,
  userProfileRequest,
  dmCreateRequest,
  userProfileSethandleRequest,
  channelJoinRequest,
  messageSendRequest,
  channelInviteRequest,
  userProfileSetname,
  userProfileSetemail,
  dmDeleteRequest,
  messageRemoveRequest,
  messageEditRequest,
  channelDetailsRequest,
  channelAddownerRequest,
  dmMessagesRequest,
  messageSendDmRequest,
  channelLeaveRequest,
  channelRemoveownerRequest,
  dmDetailsRequest,
} from './types';
import { channelMessagesV1, channelJoinV1, channelInviteV1, channelDetailsV1, channelAddOwnersV1, channelLeaveV1, channelRemoveOwnersV1 } from './channel';
import fs from 'fs';
import { setData } from './dataStore';
import { deleteDm, dmCreation, dmLeave, dmlist, dmMessages, dmDetails } from './dms';
import { dmMessageSend, messageEdit, messageRemove, messageSend } from './message';
import HTTPError from 'http-errors';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// Example get request
app.get('/echo', (req: Request, res: Response, next) => {
  try {
    const data = req.query.echo as string;
    return res.json(echo(data));
  } catch (err) {
    next(err);
  }
});

if (fs.existsSync('./database.json')) {
  const dbstr = fs.readFileSync('./database.json');
  setData(JSON.parse(String(dbstr)));
}

/**
 * Given a registered user's email and password, returns their authUserId value.
 *
 * @param {string} email - user's email
 * @param {string} password - user's password
 *
 * @returns {string} token - temp token for the authUserId
 * @returns {number} authUserId - autherUserId made by the function
 */
app.post('/auth/login/v3', (req: Request, res: Response, next) => {
  try {
    const { email, password } = req.body as authLoginRequest;
    const result = authLoginV1(encodeURI(email), encodeURI(password));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Given a user's first and last name, email address, and password,
 * creates a new account for them and returns a new authUserId.
 *
 * @param {string} email - user's email
 * @param {string} password - user's password
 * @param {string} nameFirst - user's First name
 * @param {string} nameLast - user's last name
 *
 * @returns {string} token - temp token for the authUserId
 * @returns {number} authUserId - autherUserId made by the function
 */
app.post('/auth/register/v3', (req: Request, res: Response, next) => {
  try {
    const { email, password, nameFirst, nameLast } = req.body as authRegisterRequest;
    const result = authRegisterV1(encodeURI(email), encodeURI(password), encodeURI(nameFirst), encodeURI(nameLast));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/auth/passwordreset/request/v1', (req: Request, res: Response) => {
  const { email } = req.body;
  const result = (sendPasswordResetEmail(email));
  res.json(result);
});

/**
 * Creates a new channel with the given name that is either a public
 * or private channel. The user who created it automatically joins
 * the channel and is the owner.
 *
 * @param {string} token - user's token
 * @param {string} name - user's name
 * @param {string} isPublic - public or not for the channel
 *
 * @returns {number} channelId - channelId made by the function
 */
app.post('/channels/create/v2', (req: Request, res: Response) => {
  const { token, name, isPublic } = req.body as channelsCreateRequest;

  // get the authUserId using token
  const authUserId = getAuthUserIdFromToken(token);

  // after get authUserId, we call channelsCreateV1
  const result = channelsCreateV1(authUserId, name, isPublic);

  res.json(result);
});

/**
 * Provide a list of all channels (and their associated details) that
 * the authorised user is part of.
 *
 * @param {string} token - user's token
 *
 * @returns {number} channelId - channelId made by the function
 */
app.get('/channels/list/v2', (req: Request, res: Response) => {
  const { token } = req.query as channelsListRequest;
  const authUserId = getAuthUserIdFromToken(token);
  const result = channelsListV1(authUserId);
  res.json(result);
});

app.get('/channels/listAll/v2', (req: Request, res: Response) => {
  const { token } = req.query as channelsListAllRequest;
  const authUserId = getAuthUserIdFromToken(token);

  if (authUserId == null) {
    return res.json({ error: 'invalid token' });
  } else {
    return res.json(channelsListAllV1(authUserId));
  }
});

app.post('/auth/logout/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const result = removetoken(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/channel/messages/v2', (req: Request, res: Response) => {
  const { token, channelId, start } = req.query as unknown as channelMessagesRequest;
  const authUserId = getAuthUserIdFromToken(token);

  if (authUserId == null) {
    return res.json({ error: 'invalid token' });
  } else {
    return res.json(channelMessagesV1(authUserId, Number(channelId), Number(start)));
  }
});

app.post('/channel/join/v2', (req: Request, res: Response) => {
  const { token, channelId } = req.body as channelJoinRequest;

  // get the authUserId using token
  const authUserId = getAuthUserIdFromToken(token);

  // after get authUserId, we call channelJoinV1
  const result = channelJoinV1(authUserId, channelId);

  res.json(result);
});

app.post('/channel/invite/v2', (req: Request, res: Response) => {
  const { token, channelId, uId } = req.body as channelInviteRequest;

  // get the authUserId using token
  const authUserId = getAuthUserIdFromToken(token);

  // after get authUserId, we call channelInviteV1
  const result = channelInviteV1(authUserId, channelId, uId);

  res.json(result);
});

app.post('/channel/leave/v1', (req: Request, res: Response) => {
  const { token, channelId } = req.body as channelLeaveRequest;
  const result = channelLeaveV1(token, channelId);
  res.json(result);
});

app.get('/channel/details/v2', (req: Request, res: Response) => {
  const { token, channelId } = req.query as unknown as channelDetailsRequest;
  const authUserId = getAuthUserIdFromToken(token);
  if (authUserId == null) {
    return res.json({ error: 'Token is invalid' });
  } else {
    const result = channelDetailsV1(authUserId, channelId);
    res.json(result);
  }
});

app.post('/channel/addowner/v1', (req: Request, res: Response) => {
  const { token, channelId, uId } = req.body as channelAddownerRequest;
  const authUserId = getAuthUserIdFromToken(token);
  const result = channelAddOwnersV1(
    parseInt(encodeURI(authUserId.toString())),
    parseInt(encodeURI(channelId.toString())),
    parseInt(encodeURI(uId.toString())));
  res.json(result);
});

app.post('/channel/removeowner/v1', (req: Request, res: Response) => {
  const { token, channelId, uId } = req.body as channelRemoveownerRequest;
  const authUserId = getAuthUserIdFromToken(token);

  const result = channelRemoveOwnersV1(
    parseInt(encodeURI(authUserId.toString())),
    parseInt(encodeURI(channelId.toString())),
    parseInt(encodeURI(uId.toString())));
  res.json(result);
});

app.get('/users/all/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const authUserId = getAuthUserIdFromToken(token);
    if (authUserId == null) {
      throw HTTPError(403, 'Invalid token');
    } else {
      const result = listAllUsersV1(token);
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
});

app.get('/user/profile/v3', (req: Request, res: Response, next) => {
  try {
    const { uId } = req.query as unknown as userProfileRequest;
    const token = req.header('token');
    const authUserId = getAuthUserIdFromToken(token);
    const uuId = parseInt(uId.toString());
    const result = userProfileV1(authUserId, uuId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.put('/user/profile/sethandle/v2', (req: Request, res: Response, next) => {
  try {
    const { handleStr } = req.body as userProfileSethandleRequest;
    const token = req.header('token');
    const result = userProfileHandleChange(token, handleStr);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.put('/user/profile/setemail/v2', (req: Request, res: Response, next) => {
  try {
    const { email } = req.body as userProfileSetemail;
    const token = req.header('token');
    const result = userProfileEmailChange(token, email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.put('/user/profile/setname/v2', (req: Request, res: Response, next) => {
  try {
    const { nameFirst, nameLast } = req.body as userProfileSetname;
    const token = req.header('token');
    const result = userProfileNameChange(token, nameFirst, nameLast);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/message/send/v1', (req: Request, res: Response) => {
  const { token, channelId, message } = req.body as messageSendRequest;
  const authUserId = getAuthUserIdFromToken(token);

  if (authUserId == null) {
    return res.json({ error: 'token is invalid' });
  } else {
    return res.json(messageSend(Number(authUserId), Number(channelId), message));
  }
});

app.put('/message/edit/v1', (req: Request, res: Response) => {
  const { token, messageId, message } = req.body as unknown as messageEditRequest;
  const authUserId = getAuthUserIdFromToken(token);

  if (authUserId == null) {
    return res.json({ error: 'token is invalid' });
  } else {
    return res.json(messageEdit(Number(authUserId), Number(messageId), message));
  }
});

app.delete('/message/remove/v1', (req: Request, res: Response) => {
  const { token, messageId } = req.query as unknown as messageRemoveRequest;
  const authUserId = getAuthUserIdFromToken(token);

  if (authUserId == null) {
    return res.json({ error: 'token is invalid' });
  } else {
    return res.json(messageRemove(Number(authUserId), Number(messageId)));
  }
});

app.post('/message/senddm/v2', (req: Request, res: Response, next) => {
  try {
    const { dmId, message } = req.body as unknown as messageSendDmRequest;
    const token = req.header('token');
    const authUserId = getAuthUserIdFromToken(token);
    return res.json(dmMessageSend(Number(authUserId), Number(dmId), message));
  } catch (err) {
    next(err);
  }
});

app.post('/dm/create/v2', (req: Request, res: Response, next) => {
  try {
    const { uIds } = req.body as dmCreateRequest;
    const token = req.header('token');
    const result = dmCreation(token, uIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/dm/list/v2', (req: Request, res: Response, next) => {
  try {
    const token = req.header('token');
    const result = dmlist(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/dm/messages/v2', (req: Request, res: Response, next) => {
  try {
    const { dmId, start } = req.query as unknown as dmMessagesRequest;
    const token = req.header('token');
    const authUserId = getAuthUserIdFromToken(token);
    return res.json(dmMessages(authUserId, Number(dmId), Number(start)));
  } catch (err) {
    next(err);
  }
});

app.delete('/dm/remove/v2', (req: Request, res: Response, next) => {
  try {
    const { dmId } = req.query as unknown as dmDeleteRequest;
    const token = req.header('token');
    const result = deleteDm(token, dmId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/dm/leave/v2', (req: Request, res: Response, next) => {
  try {
    const { dmId } = req.body as dmDeleteRequest;
    const token = req.header('token');
    const result = dmLeave(token, dmId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.get('/dm/details/v2', (req: Request, res: Response, next) => {
  try {
    const { dmId } = req.query as unknown as dmDetailsRequest;
    const token = req.header('token');
    const result = dmDetails(token, dmId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.delete('/clear/v1', (_: Request, res: Response) => {
  clearV1();
  res.json({});
});

// handles errors nicely
app.use(errorHandler());

// for logging errors (print to terminal)
app.use(morgan('dev'));

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server listening on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});
