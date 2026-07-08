/**
 * TTS 音频播放工具类
 * 负责音频播放控制、加载状态维护、audioContext 的生命周期
 * 业务逻辑（格式化订单、调用 API、队列管理）由调用方处理
 */

class TTSHelper {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   * @param {Function} options.onPlayStart 播放开始回调 (audioContext) => {}
   * @param {Function} options.onPlayEnd 播放结束回调 () => {}
   * @param {Function} options.onError 错误回调 (error) => {}
   * @param {Function} options.onCanplay 音频可以播放回调 (audioContext) => {}
   */
  constructor(options = {}) {
    this.audioContext = null;
    this.onPlayStart = options.onPlayStart || null;
    this.onPlayEnd = options.onPlayEnd || null;
    this.onError = options.onError || null;
    this.onCanplay = options.onCanplay || null;
    
    console.log('[TTSHelper] 工具类初始化完成');
  }

  /**
   * 播放音频
   * @param {String} audioUrl 音频文件URL
   * @param {String} text 朗读文本（用于日志）
   * @returns {Boolean} 是否成功开始播放
   */
  playAudio(audioUrl, text) {
    if (!audioUrl) {
      console.error('[TTSHelper] 音频URL为空');
      if (this.onError) {
        this.onError({ errMsg: '音频URL为空' });
      }
      return false;
    }

    // 停止之前的音频（并等待 Android 上完全释放后再创建新上下文）
    this.stop();
    this._hasCalledPlay = false;

    // 创建音频上下文
    this.audioContext = wx.createInnerAudioContext();

    // iOS 真机关键设置（必须在设置 src 之前）
    this.audioContext.volume = 1.0;

    try {
      this.audioContext.obeyMuteSwitch = false;
    } catch (e) {
      console.warn('[TTSHelper] obeyMuteSwitch 设置失败（可能不支持）:', e);
    }

    this.audioContext.src = audioUrl;
    this.audioContext.autoplay = false;

    // 1. 错误监听
    this.audioContext.onError((err) => {
      const errMsg = (err && err.errMsg) ? String(err.errMsg) : '';
      if (errMsg.indexOf('audio is playing') !== -1 && errMsg.indexOf("don't play again") !== -1) {
        console.log('[TTSHelper] 忽略「已在播放」的重复 play 报错');
        return;
      }
      
      const errorMsg = '播放失败：' + (err.errMsg || err.errCode || '未知错误');
      this.destroy();
      if (this.onError) {
        this.onError({
          errMsg: errorMsg,
          errCode: err.errCode,
          originalError: err
        });
      }
    });

    // 2. 播放开始监听
    this.audioContext.onPlay(() => {
      if (!this.audioContext) return;
      this.audioContext.volume = 1.0;
      try {
        this.audioContext.obeyMuteSwitch = false;
      } catch (e) {}
      if (this.onPlayStart) {
        this.onPlayStart(this.audioContext);
      }
    });

    // 3. 音频可以播放监听
    this.audioContext.onCanplay(() => {
      if (!this.audioContext) return;
      if (this.audioContext.volume !== 1.0) {
        this.audioContext.volume = 1.0;
      }
      try {
        if (this.audioContext.obeyMuteSwitch !== false) {
          this.audioContext.obeyMuteSwitch = false;
        }
      } catch (e) {}

      if (!this._hasCalledPlay && this.audioContext.paused !== false) {
        this._hasCalledPlay = true;
        try {
          this.audioContext.play();
        } catch (e) {
          this._hasCalledPlay = false;
          this.destroy();
          if (this.onError) {
            this.onError({
              errMsg: '播放失败：' + (e.message || '未知错误'),
              errCode: -1,
              originalError: e
            });
          }
          return;
        }
      }

      if (this.onCanplay) {
        this.onCanplay(this.audioContext);
      }
    });

    this.audioContext.onWaiting(() => {});
    this.audioContext.onTimeUpdate(() => {});

    // 4. 播放完成监听
    this.audioContext.onEnded(() => {
      this.destroy();
      if (this.onPlayEnd) {
        this.onPlayEnd();
      }
    });

    // 延迟播放兜底
    this._playTimer = setTimeout(() => {
      if (!this.audioContext) return;
      if (this.audioContext.paused === false) return;
      if (this._hasCalledPlay) return;
      try {
        this._hasCalledPlay = true;
        this.audioContext.volume = 1.0;
        this.audioContext.play();
      } catch (e) {
        this._hasCalledPlay = false;
        this.destroy();
        if (this.onError) {
          this.onError({
            errMsg: '播放失败：' + (e.message || '未知错误'),
            errCode: -1,
            originalError: e
          });
        }
      }
    }, 200);

    return true;
  }

  pause() {
    if (this.audioContext) {
      this.audioContext.pause();
    }
  }

  stop() {
    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
    }
    
    if (this.audioContext) {
      try {
        this.audioContext.stop();
      } catch (e) {}
      this.destroy();
    }
  }

  destroy() {
    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
    }
    
    if (this.audioContext) {
      try {
        try {
          this.audioContext.stop();
        } catch (e) {}
        if (typeof this.audioContext.destroy === 'function') {
          this.audioContext.destroy();
        }
      } catch (e) {
        console.warn('[TTSHelper] 销毁音频上下文时出错:', e);
      } finally {
        this.audioContext = null;
      }
    }
  }

  getAudioContext() {
    return this.audioContext;
  }

  isPlaying() {
    return this.audioContext && !this.audioContext.paused;
  }
}

module.exports = TTSHelper;
