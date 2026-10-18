# 把整个游戏打包成一个单独的网页（预览模式：一台设备上同时看两边）
import sys, re
d = 'public/'
css = open(d + 'style.css').read()
js = ''.join('<script>' + open(d + f).read() + '</script>\n' for f in ['story/ch%d.js' % i for i in range(1, 9)] + ['custom.js', 'logic.js', 'art.js', 'game.js'])
out = ('<title>两端的灯</title>\n'
       '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
       '<link href="https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@400;600&display=swap" rel="stylesheet">\n'
       '<style>' + css + '</style>\n<div id="app"></div>\n<script>window.LAMP_PREVIEW = true;</script>\n' + js)
open(sys.argv[1], 'w').write(out)
