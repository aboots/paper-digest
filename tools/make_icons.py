from PIL import Image, ImageDraw, ImageFont
import os
def glyph(size, rounded):
    S=size*4
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    bg=(15,23,42,255)
    if rounded: d.rounded_rectangle([0,0,S-1,S-1],radius=int(S*0.22),fill=bg)
    else: d.rectangle([0,0,S,S],fill=bg)
    # page glyph
    w=S*0.40; h=S*0.52; x0=(S-w)/2; y0=(S-h)/2-S*0.02; fold=w*0.30
    pts=[(x0,y0),(x0+w-fold,y0),(x0+w,y0+fold),(x0+w,y0+h),(x0,y0+h)]
    d.polygon(pts,fill=(241,245,249,255))
    d.polygon([(x0+w-fold,y0),(x0+w,y0+fold),(x0+w-fold,y0+fold)],fill=(148,163,184,255))
    lw=S*0.022; accent=(56,189,248,255); grey=(100,116,139,255)
    yy=y0+h*0.36
    d.rounded_rectangle([x0+w*0.14,yy,x0+w*0.64,yy+lw*1.6],radius=lw,fill=accent)
    for i,fr in enumerate([0.52,0.66,0.80]):
        y=y0+h*fr
        d.rounded_rectangle([x0+w*0.14,y,x0+w*(0.86 if i<2 else 0.58),y+lw*1.4],radius=lw,fill=grey)
    return im.resize((size,size),Image.LANCZOS)
os.makedirs('icons',exist_ok=True)
glyph(180,False).convert('RGB').save('icons/apple-touch-icon.png')
glyph(192,True).save('icons/icon-192.png')
glyph(512,True).save('icons/icon-512.png')
