//channelsCreateV1 stub fucntion
function channelsCreateV1( authUserId, name, isPublic ){
    return {
      channelId: 1,
    }
  }

//channelsListV1 stub fucntion
function channelsListV1( authUserId ){
    return {
        channels: [
          {
            channelId: 1,
            name: 'My Channel',
          }
        ],
      }
  }

//channelsListAllV1 stub fucntion
function channelsListAllV1( authUserId ){
    return {
        channels: [
          {
            channelId: 1,
            name: 'My Channel',
          }
        ],
      }
  }