import Promise from './bluebird'
import apiUrl from '../config.js'

let cachedAsrCredentials = null

function post(path, data, timeout) {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + path,
      method: 'POST',
      timeout: timeout || 30000,
      header: { 'Content-Type': 'application/json' },
      data,
      success: (response) => {
        const result = response.data || {}
        if (response.statusCode >= 200 && response.statusCode < 300 && result.code === 0) {
          resolve(result.data)
          return
        }
        reject(new Error(result.msg || '云服务请求失败'))
      },
      fail: () => reject(new Error('网络请求失败'))
    })
  })
}

export async function getAsrCredentials() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedAsrCredentials && Number(cachedAsrCredentials.expiredTime || 0) > now + 60) {
    return cachedAsrCredentials
  }
  const credentials = await post('mini-program-cloud/asr-credentials', {
    clientType: 'BOSS'
  })
  if (!credentials || !credentials.appId || !credentials.secretId ||
    !credentials.secretKey || !credentials.token || !credentials.expiredTime) {
    throw new Error('语音服务返回的临时凭证不完整')
  }
  cachedAsrCredentials = credentials
  return cachedAsrCredentials
}

export async function completeWithDeepSeek({ text, systemPrompt, temperature }) {
  return post('mini-program-cloud/deepseek/complete', {
    text,
    systemPrompt,
    temperature
  }, 130000)
}
