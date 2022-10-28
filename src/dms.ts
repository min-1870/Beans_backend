import { getData, setData } from './dataStore';
import { dataStore, dataStoreUser, dm, dms, error, messages } from './types';
import { dataStoreUserToUser, duplicateValueCheck, getAuthUserIdFromToken, getDataStoreDm, getDataStoreUser, isAuthUserIdValid, isDataStoreDmValid, isUserMemberInDm, toOutputDms, toOutputDmDetails } from './utils';

let uniqueDmId = 0;

/**
  * Creates the Dm from token user to users entered in uIds
  *
  * @param {string} token - user that initiated command
  * @param {[number]} uIds - array of uIds dm is directed to
  * ...
  *
  * @returns {number} - returns an object containing dmId
*/
export function dmCreation(token:string, uIds: [number]): ({dmId: number} | error) {
  const data: dataStore = getData();

  if (!isAuthUserIdValid(getAuthUserIdFromToken(token), data)) {
    return { error: 'Token is Invalid' };
  }

  for (const item of uIds) {
    if (data.users.find(user => user.uId === item) == null) {
      return { error: 'Invalid uId in uIds' };
    }
  }
  if (duplicateValueCheck(uIds) === true) {
    return { error: 'Duplicate uId values entered' };
  }

  const DmName = dmNameGenerator(token, uIds);
  const ownerMembers = dataStoreUserToUser(getDataStoreUser(getAuthUserIdFromToken(token), data));
  const allMembers = [ownerMembers];

  for (const item of uIds) {
    allMembers.push(dataStoreUserToUser(getDataStoreUser(item, data)));
  }

  for (let i = 0; i < data.users.length; i++) {
    const user: dataStoreUser = data.users[i];
    for (let j = 0; j < user.sessionTokens.length; j++) {
      if (user.sessionTokens[j] === token) {
        data.dms.push({
          dmId: uniqueDmId,
          name: DmName,
          ownerMembers: [ownerMembers],
          allMembers: allMembers,
          messages: []
        });
        const ret = uniqueDmId;
        uniqueDmId++;
        setData(data);
        return { dmId: ret };
      }
    }
  }
}

/**
  * Helper function that creates the name for dm
  *
  * @param {string} token - user that initiated command
  * @param {[number]} uIds - array of uIds dm is directed to
  * ...
  *
  * @returns {string} - returns a string which is the name of the function
*/
function dmNameGenerator(token:string, uIds: [number]): (string) {
  const data: dataStore = getData();
  const owner = getAuthUserIdFromToken(token);

  let arr = [];
  for (let i = 0; i < data.users.length; i++) {
    const user: dataStoreUser = data.users[i];
    if (user.uId === owner) {
      arr.push(user.handleStr);
    }
  }

  for (const item of uIds) {
    for (let i = 0; i < data.users.length; i++) {
      const user: dataStoreUser = data.users[i];
      if (user.uId === item) {
        arr.push(user.handleStr);
      }
    }
  }
  arr = arr.sort();

  const ret = arr.join(', ');

  return ret;
}

/**
  * Returns the list of DMs that the user is a member of
  *
  * @param {string} token - user that initiated command
  * ...
  *
  * @returns {[object]} - array of objects, each containing {dmId, name}
*/
export function dmlist(token:string): (dms | error) {
  const data: dataStore = getData();
  if (!isAuthUserIdValid(getAuthUserIdFromToken(token), data)) {
    return { error: 'Token is Invalid' };
  }
  const authUserId = getAuthUserIdFromToken(token);
  const dms = data.dms
    .filter(dm => dm.allMembers
      .find(member => member.uId === authUserId) != null) || [];

  return toOutputDms(dms);
}

export function deleteDm(token:string, dmId:number) {
  const data: dataStore = getData();
  const authUserId = getAuthUserIdFromToken(token);
  if (!isAuthUserIdValid(getAuthUserIdFromToken(token), data)) {
    return { error: 'Token is Invalid' };
  }
  if (!isDataStoreDmValid(dmId, data)) {
    return { error: 'dmId is Invalid' };
  }
  for (const item of data.dms) {
    if (item.dmId.toString() === dmId.toString()) {
      if (item.ownerMembers[0].uId !== getAuthUserIdFromToken(token)) {
        return { error: 'user is not owner of dm' };
      }
    }
  }
  for (const item of data.dms) {
    if (item.dmId.toString() === dmId.toString()) {
      if (item.allMembers.find(user => user.uId.toString() === authUserId.toString()) == null) {
        return { error: 'user is not part of dm' };
      }
    }
  }

  const index = data.dms.findIndex(dm => dm.dmId.toString() === dmId.toString());
  data.dms.splice(index, 1);
  setData(data);
  return {};
}

/**
  * Removes the user from the dm
  *
  * @param {string} token - user that initiated command
  * @param {number} dmId - dm to remove user from
  *
  * ...
  *
  * @returns {{}} - empty array
*/
export function dmLeave(token:string, dmId:number): (Record<string, never> | error) {
  const data: dataStore = getData();
  const authUserId = getAuthUserIdFromToken(token);
  if (!isAuthUserIdValid(getAuthUserIdFromToken(token), data)) {
    return { error: 'Token is Invalid' };
  }
  if (!isDataStoreDmValid(dmId, data)) {
    return { error: 'dmId is Invalid' };
  }
  for (const item of data.dms) {
    if (item.dmId.toString() === dmId.toString()) {
      if (item.allMembers.find(user => user.uId.toString() === authUserId.toString()) == null) {
        return { error: 'user is not part of dm' };
      }
    }
  }

  const indexOne = data.dms.findIndex(dm => dm.dmId.toString() === dmId.toString());
  const indexTwo = data.dms[indexOne].allMembers.findIndex(member => member.uId.toString() === getAuthUserIdFromToken(token).toString());
  data.dms[indexOne].allMembers.splice(indexTwo, 1);
  setData(data);
  return {};
}

/**
  * Returns the messages
  *
  * @param {string} token - user that initiated
  * @param {number} dmId - a dm ID in the dataStore
  * @param {number} start - the index of the starting point
  *
  * ...
  *
  * @returns { {messages: messages[], start: number, end: number} } - an object contains the messages and information of pages
*/
export function dmMessages(authUserId: number, dmId: number, start: number): ({ messages: messages[], start: number, end: number } | error) {
  const data = getData();
  const dm = getDataStoreDm(dmId, data);
  if (dm == null) {
    return { error: 'dmId is Invalid' };
  } else if (!isAuthUserIdValid(authUserId, data)) {
    return { error: 'Invalid user ID' };
  } else if (start < 0 || start > dm.messages.length) {
    return { error: 'Invalid start' };
  } else if (!isUserMemberInDm(authUserId, dmId, data)) {
    return { error: 'user is not part of dm' };
  }

  const messages = dm.messages;
  let slicedMessages: messages[];
  let end: number;

  if (start + 50 >= messages.length) {
    end = -1;
    slicedMessages = messages.slice(start);
  } else {
    end = start + 50;
    slicedMessages = messages.slice(start, end);
  }

  return {
    messages: slicedMessages,
    start: start,
    end: end
  };
}

/**
  * Given a DM with ID dmId that the authorised user is a member of,
  * provide basic details about the dm
  *
  * @param {number} token- intiating user
  * @param {number} dmId - id of dm
  *
  * @returns {object} - An object containing basic details of the dm, name and members
*/
export function dmDetails(token:string, dmId:number): (dm | error) {
  const data: dataStore = getData();
  const authUserId = getAuthUserIdFromToken(token);
  if (!isAuthUserIdValid(getAuthUserIdFromToken(token), data)) {
    return { error: 'Token is Invalid' };
  }
  if (!isDataStoreDmValid(dmId, data)) {
    return { error: 'dmId is Invalid' };
  }
  for (const item of data.dms) {
    if (item.dmId.toString() === dmId.toString()) {
      if (item.allMembers.find(user => user.uId.toString() === authUserId.toString()) == null) {
        return { error: 'user is not part of dm' };
      }
    }
  }
  const dms = data.dms
    .filter(dms => dms.allMembers
      .find(member => member.uId === authUserId) != null) || [];

  return toOutputDmDetails(dms);
}
