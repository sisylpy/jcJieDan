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

    // console.log('[TTSHelper] 开始播放音频URL:', audioUrl);
    // console.log('[TTSHelper] 朗读文本:', text);

    // 停止之前的音频
    this.stop();

    // 创建音频上下文
    this.audioContext = wx.createInnerAudioContext();

    // iOS 真机关键设置（必须在设置 src 之前）
    this.audioContext.volume = 1.0; // 设置音量为最大（0.0 - 1.0）

    // 注意：obeyMuteSwitch 属性在某些基础库版本中可能不支持设置
    // 如果支持，设置为 false 可以让音频在静音模式下也能播放
    try {
      this.audioContext.obeyMuteSwitch = false; // iOS：不遵循静音开关（重要！）
    } catch (e) {
      console.warn('[TTSHelper] obeyMuteSwitch 设置失败（可能不支持）:', e);
    }

    this.audioContext.src = audioUrl;
    this.audioContext.autoplay = true;

    // 延迟一下再检查设置是否生效
    // setTimeout(() => {
    //   if (this.audioContext) {
    //     console.log('[TTSHelper] 音频上下文设置:', {
    //       volume: this.audioContext.volume,
    //       obeyMuteSwitch: this.audioContext.obeyMuteSwitch,
    //       src: audioUrl.substring(0, 50) + '...'
    //     });
    //   } else {
    //     console.warn('[TTSHelper] 音频上下文已被销毁，无法检查设置');
    //   }
    // }, 50);

    // ========== 注册事件监听（必须在调用 play() 之前注册） ==========

    // 1. 错误监听（最重要，必须在最前面注册）
    this.audioContext.onError((err) => {
      // console.error('[TTSHelper] 播放失败:', err);
      // console.error('[TTSHelper] 错误详情:', JSON.stringify(err));
      // console.error('[TTSHelper] 错误码:', err.errCode);
      // console.error('[TTSHelper] 错误信息:', err.errMsg);
      
      const errorMsg = '播放失败：' + (err.errMsg || err.errCode || '未知错误');
      
      // 清理资源
      this.destroy();
      
      // 通知错误回调
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
      if (!this.audioContext) {
        console.warn('[TTSHelper] onPlay 回调时音频上下文已被销毁');
        return;
      }
      
      // console.log('[TTSHelper] 开始播放音频');
      // console.log('[TTSHelper] 当前音量:', this.audioContext.volume);
      // console.log('[TTSHelper] 是否暂停:', this.audioContext.paused);
      // console.log('[TTSHelper] 当前时间:', this.audioContext.currentTime);
      // console.log('[TTSHelper] 音频时长:', this.audioContext.duration);
      // console.log('[TTSHelper] obeyMuteSwitch:', this.audioContext.obeyMuteSwitch);

      // 在播放时再次确保设置
      this.audioContext.volume = 1.0;
      try {
        this.audioContext.obeyMuteSwitch = false;
        console.log('[TTSHelper] 在 onPlay 中设置 obeyMuteSwitch = false, 结果:', this.audioContext.obeyMuteSwitch);
      } catch (e) {
        console.warn('[TTSHelper] onPlay 中设置 obeyMuteSwitch 失败:', e);
      }

      // 通知播放开始回调
      if (this.onPlayStart) {
        this.onPlayStart(this.audioContext);
      }
    });

    // 3. 音频可以播放监听
    this.audioContext.onCanplay(() => {
      if (!this.audioContext) {
        console.warn('[TTSHelper] onCanplay 回调时音频上下文已被销毁');
        return;
      }
      
      console.log('[TTSHelper] 音频可以播放');
      console.log('[TTSHelper] 音频时长:', this.audioContext.duration);
      
      // 确保音量设置正确
      if (this.audioContext.volume !== 1.0) {
        this.audioContext.volume = 1.0;
        console.log('[TTSHelper] 重新设置音量为1.0');
      }
      
      // 再次尝试设置 obeyMuteSwitch（某些版本需要在 onCanplay 后设置）
      try {
        if (this.audioContext.obeyMuteSwitch !== false) {
          this.audioContext.obeyMuteSwitch = false;
          console.log('[TTSHelper] 在 onCanplay 中设置 obeyMuteSwitch = false, 当前值:', this.audioContext.obeyMuteSwitch);
        }
      } catch (e) {
        console.warn('[TTSHelper] onCanplay 中设置 obeyMuteSwitch 失败:', e);
      }

      // 通知可以播放回调
      if (this.onCanplay) {
        this.onCanplay(this.audioContext);
      }
    });

    // 4. 音频加载中监听
    this.audioContext.onWaiting(() => {
      console.log('[TTSHelper] 音频加载中...');
    });

    // 5. 播放进度监听（用于调试）
    this.audioContext.onTimeUpdate(() => {
      if (!this.audioContext) {
        return;
      }
      // 只在开发环境打印，避免日志过多
      if (this.audioContext.currentTime > 0 && this.audioContext.currentTime < 0.5) {
        console.log('[TTSHelper] 播放进度:', this.audioContext.currentTime, '/', this.audioContext.duration);
      }
    });

    // 6. 播放完成监听
    this.audioContext.onEnded(() => {
      console.log('[TTSHelper] 播放完成');
      
      // 清理资源
      this.destroy();
      
      // 通知播放结束回调
      if (this.onPlayEnd) {
        this.onPlayEnd();
      }
    });

    // ========== 调用播放方法 ==========
    // 注意：微信小程序的 play() 不返回 Promise，不能使用 .catch()
    // 所有错误都通过 onError 事件监听来处理

    // 延迟播放，确保音频加载完成
    // 保存 setTimeout 的 ID，以便在销毁时清除
    this._playTimer = setTimeout(() => {
      if (!this.audioContext) {
        console.warn('[TTSHelper] 准备调用 play() 时音频上下文已被销毁');
        return;
      }
      
      // 再次检查音频上下文状态
      try {
        console.log('[TTSHelper] 准备调用 play()');
        // 再次确保音量设置
        this.audioContext.volume = 1.0;
        // 直接调用 play()，不使用 .catch() 或 .then()
        this.audioContext.play();
        console.log('[TTSHelper] play() 已调用');
      } catch (e) {
        console.error('[TTSHelper] 调用 play() 时出错:', e);
        // 如果出错，清理资源
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

  /**
   * 暂停播放
   */
  pause() {
    if (this.audioContext) {
      console.log('[TTSHelper] 暂停播放');
      this.audioContext.pause();
    }
  }

  /**
   * 停止播放
   */
  stop() {
    // 清除延迟播放的定时器
    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
    }
    
    if (this.audioContext) {
      console.log('[TTSHelper] 停止播放');
      try {
        this.audioContext.stop();
      } catch (e) {
        console.warn('[TTSHelper] 停止播放时出错:', e);
      }
      this.destroy();
    }
  }

  /**
   * 销毁音频上下文
   */
  destroy() {
    // 清除延迟播放的定时器
    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
    }
    
    if (this.audioContext) {
      console.log('[TTSHelper] 销毁音频上下文');
      try {
        // 先停止播放，再销毁
        try {
          this.audioContext.stop();
        } catch (e) {
          // 忽略停止时的错误
        }
        
        // 安全地销毁音频上下文
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

  /**
   * 获取当前音频上下文（用于外部访问）
   * @returns {InnerAudioContext|null}
   */
  getAudioContext() {
    return this.audioContext;
  }

  /**
   * 检查是否正在播放
   * @returns {Boolean}
   */
  isPlaying() {
    return this.audioContext && !this.audioContext.paused;
  }
}

module.exports = TTSHelper;

