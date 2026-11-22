import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
im = im.resize((im.width*2, im.height*2), Image.LANCZOS)
a = np.asarray(im).astype(np.int16)
r,g,b = a[...,0],a[...,1],a[...,2]
bg = np.median(np.concatenate([a[:20].reshape(-1,3), a[-20:].reshape(-1,3)]), axis=0)
d = np.sqrt(((a-bg)**2).sum(-1))
neutral = (np.abs(r-g) < 10) & (np.abs(g-b) < 10)
bgmask = np.zeros(d.shape, bool)
for thr, need_border, minsize in ((18, True, 0), (9, False, 120)):
    cand = (d < thr) & neutral
    lab, n = ndi.label(cand)
    if n == 0: continue
    sizes = ndi.sum(cand, lab, range(1, n+1))
    border = set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]]))) - {0}
    for i, sz in enumerate(sizes, start=1):
        if (need_border and i in border) or (not need_border and sz > minsize):
            bgmask |= (lab == i)
fg = ~bgmask
fg = ndi.binary_opening(fg, iterations=1)
lab2, n2 = ndi.label(fg)
if n2:
    sz = ndi.sum(fg, lab2, range(1,n2+1))
    keep = [i for i,s in enumerate(sz, start=1) if s > 400]
    fg = np.isin(lab2, keep)
fg = ndi.binary_erosion(fg, iterations=2)
alpha = Image.fromarray((fg*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
out = im.convert('RGBA'); out.putalpha(alpha)
bbox = alpha.point(lambda v: 255 if v>8 else 0).getbbox()
pad = 24
box = (max(bbox[0]-pad,0), max(bbox[1]-pad,0), min(bbox[2]+pad,out.width), min(bbox[3]+pad,out.height))
out.crop(box).save(dst)
print(src, '->', dst, out.crop(box).size, 'bg', bg.astype(int))
