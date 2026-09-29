"""Build the transparent anatomy image and muscle hit regions from assets/anatomy-atlas.png.

Muscle regions are grown with a marker-based watershed: each seed below sits on a muscle belly
and the region expands until it meets a darker groove in the sculpt, so edges follow the image.
Seeds in NEUTRAL cover parts that are not selectable (head, hands, knees, shorts, feet).

Run from mock/ember:  python tools/segment_anatomy.py [debug-dir]
Needs numpy, opencv-python-headless, scikit-image, scipy.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy import ndimage as ndi
from skimage.segmentation import watershed

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets' / 'anatomy-atlas.png'
OUT_IMAGE = ROOT / 'assets' / 'anatomy-cutout.webp'
OUT_JS = ROOT / 'js' / 'anatomy-regions.js'
DEBUG = Path(sys.argv[1]) if len(sys.argv) > 1 else None

# Shorts bands: every row between the outer edges is fabric, even where folds are as dark as the background.
SHORTS = {'front': (392, 560), 'back': (390, 556)}
VIEW_X = {'front': (225, 665), 'back': (870, 1310)}
# Each figure is mirrored about this column (its silhouette matches its mirror image to within ~2%).
# Lighting differs between the two sides, so regions are built for the viewer's left half and mirrored,
# which keeps left and right muscles identical in shape.
MID = {'front': 439.5, 'back': 1089.0}
# Lowest row a group may reach, so forearms stop at the wrist and calves above the ankle.
MAX_Y = {('front', 'forearms'): 486, ('back', 'forearms'): 486, ('front', 'biceps'): 342, ('front', 'quads'): 662, ('back', 'calves'): 805}
# Glutes sit under the shorts, so they are drawn as a rounded shape clipped to the fabric.
GLUTE = (1047, 466, 44, 40)  # centre x, centre y, radius x, radius y (left glute): yoke seam y≈428, fold y≈505, side seam x≈1003
# Areas carved out of whatever the watershed gave them, where a groove is too faint to stop the flood:
# the obliques' back corner, below the diagonal groove at the lower edge of the lats.
# An optional fourth item limits the carve to pixels of that group only.
CARVE = [
    ('back', 'obliques', [(1015, 334), (1024, 338), (1040, 350), (1053, 368), (1063, 391), (1014, 393)]),
    # Gym taxonomy (free-exercise-db, Hevy): "traps" is the upper trapezius that shrugs train; the middle
    # and lower trapezius below the scapular spine belong to "upper back" with the rows.
    ('back', 'back', [(990, 200), (1025, 208), (1055, 201), (1075, 193), (1089, 188), (1089, 340), (990, 340)], 'traps'),
]
# Muscles hidden by the shorts, estimated from the leg outline and the groin/glute folds (viewer's left
# leg, mirrored). Listed in paint order: later shapes do not overwrite earlier ones.
UNDER_SHORTS = [
    ('front', 'abductors', [(336, 412), (352, 418), (362, 436), (350, 458), (340, 486), (333, 462)]),
    ('front', 'adductors', [(406, 486), (424, 500), (436, 516), (434, 540), (428, 566), (412, 566), (411, 520)]),
    ('front', 'quads', [(352, 418), (366, 440), (386, 462), (406, 486), (411, 520), (412, 566), (330, 566), (333, 520), (340, 486), (350, 458), (362, 436)]),
    ('back', 'abductors', [(984, 410), (1036, 407), (1028, 428), (1006, 436), (1003, 488), (986, 494), (983, 452)]),
    ('back', 'hamstrings', [(985, 494), (1003, 488), (1030, 500), (1060, 507), (1086, 508), (1086, 566), (984, 566)]),
]

# (group, [(x, y), ...]) on the viewer's left half or the midline. Coordinates are atlas pixels.
SEEDS = {
    'front': [
        ('neck', [(439, 150), (428, 160), (420, 140), (414, 158), (412, 145), (424, 178), (418, 170)]),
        ('traps', [(365, 172)]),
        ('shoulders', [(322, 212), (312, 235)]),
        ('chest', [(395, 232), (375, 215), (415, 250)]),
        ('biceps', [(315, 285), (320, 305)]),
        ('forearms', [(282, 420), (276, 455), (292, 390)]),
        ('abs', [(439, 272), (439, 300), (439, 330), (439, 360), (439, 385), (420, 285), (415, 315), (415, 345), (420, 378)]),
        ('obliques', [(372, 330), (376, 365)]),
        ('quads', [(360, 580), (385, 590), (345, 600), (392, 615), (370, 610), (395, 630), (400, 638), (350, 615)]),
        ('calves', [(390, 728), (340, 728)]),
    ],
    'back': [
        ('traps', [(1050, 185), (1089, 210), (1065, 250), (1089, 280), (1012, 186), (1032, 176), (1060, 196), (1045, 212), (1072, 232), (1080, 262), (1070, 165)]),
        ('shoulders', [(970, 215), (962, 235)]),
        ('back', [(1025, 245)]),
        ('lats', [(1020, 295), (1040, 330), (1030, 360)]),
        ('lower-back', [(1072, 335), (1075, 360), (1078, 380), (1089, 330), (1089, 355), (1089, 378)]),
        ('triceps', [(955, 275), (945, 310)]),
        ('forearms', [(930, 400), (930, 440)]),
        ('hamstrings', [(1025, 600), (1015, 635), (1040, 580), (1000, 590), (1005, 620)]),
        ('calves', [(1000, 730), (1040, 730), (1010, 795), (990, 700), (1000, 760)]),
    ],
}
NEUTRAL = {
    'front': [(439, 70), (439, 100), (439, 195), (296, 340), (286, 500), (439, 450), (380, 480), (372, 665),
              (385, 690), (355, 690), (347, 660), (345, 682), (372, 696), (376, 684), (368, 642), (362, 770), (340, 815), (392, 815), (366, 815), (365, 840), (360, 930)],
    'back': [(1089, 60), (1089, 150), (950, 350), (942, 495), (1089, 400), (990, 480), (1025, 545), (1025, 660),
             (1000, 665), (1050, 665), (1010, 860), (995, 845), (1030, 845), (1010, 930)],
}


def body_mask(gray):
    blur = cv2.GaussianBlur(gray, (0, 0), 1.2)
    fg = cv2.morphologyEx((blur > 19.5).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    body = np.isin(lab, np.argsort(sizes)[-2:] + 1)
    # Fill across the shorts only: between the outermost fabric-dark pixels near the midline,
    # so the gap between arm and hip stays background.
    fabric = body & (blur < 60)
    for view, (y0, y1) in SHORTS.items():
        lo, hi = int(MID[view]) - 112, int(MID[view]) + 112  # shorts reach ~107px from the midline, arms start ~116px
        for y in range(y0, y1):
            xs = np.flatnonzero(fabric[y, lo:hi])
            if xs.size:
                body[y, lo + xs[0]:lo + xs[-1] + 1] = True
    body = ndi.binary_fill_holes(body)
    return cv2.morphologyEx(body.astype(np.uint8), cv2.MORPH_CLOSE,
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(bool)


def alpha_channel(gray, body):
    body = cv2.erode(body.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    inner = cv2.erode(body.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    ramp = np.clip((gray - 16.0) / 14.0, 0, 1)
    alpha = np.where(inner, 1.0, np.where(body, ramp, 0.0))
    alpha = np.maximum(alpha, cv2.GaussianBlur(inner.astype(np.float32), (0, 0), 0.8))
    return (alpha * 255).astype(np.uint8)


def elevation(gray):
    # Blur past the fibre striations so only the grooves between muscle bellies remain.
    smooth = cv2.GaussianBlur(gray, (0, 0), 3.2)
    groove = cv2.morphologyEx(smooth, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (23, 23)))
    grad = np.hypot(cv2.Sobel(smooth, cv2.CV_32F, 1, 0), cv2.Sobel(smooth, cv2.CV_32F, 0, 1))
    return groove + 0.08 * grad


def smooth_labels(labels, sigma=4.0):
    """Round every region's outline together, so neighbours stay flush with no gaps or overlaps."""
    ids = np.unique(labels)
    weights = np.stack([cv2.GaussianBlur((labels == i).astype(np.float32), (0, 0), sigma) for i in ids])
    return ids[np.argmax(weights, axis=0)]


def mirror_cols(view):
    """Column index of each column's mirror image within the view."""
    x0, x1 = VIEW_X[view]
    return np.clip(int(round(2 * MID[view])) - np.arange(x0, x1), x0, x1 - 1)


def segment(gray, body):
    """Return {(view, group): mask}, symmetric about each figure's midline."""
    height = gray.shape[0]
    relief = elevation(gray)
    masks = {}
    for view, (x0, x1) in VIEW_X.items():
        mx = mirror_cols(view)
        both = body[:, x0:x1] | body[:, mx]
        relief_sym = (relief[:, x0:x1] + relief[:, mx]) / 2  # grooves seen on either side count
        markers = np.zeros((height, x1 - x0), np.int32)
        groups = [None]
        for group, points in SEEDS[view]:
            groups.append(group)
            for x, y in points:
                cv2.circle(markers, (x - x0, y), 4, len(groups) - 1, -1)
        for x, y in NEUTRAL[view]:
            groups.append(None)
            cv2.circle(markers, (x - x0, y), 5, len(groups) - 1, -1)
        markers[~both] = 0
        labels = watershed(relief_sym, markers, mask=both, compactness=0.0005)
        labels = np.where(both, smooth_labels(labels), 0)
        left = np.arange(x0, x1) <= MID[view]
        labels = np.where(left[None, :], labels, labels[:, mx - x0])
        for index, group in enumerate(groups):
            if group:
                full = np.zeros_like(body)
                full[:, x0:x1] = labels == index
                masks[(view, group)] = masks.get((view, group), False) | full
    return masks


def remove_slivers(masks, width=9):
    """Strip tails and strands narrower than `width` px, and small detached islands, from every group and
    give those pixels to the nearest remaining group, so no region trails into its neighbour."""
    keys = list(masks)
    labels = np.zeros(next(iter(masks.values())).shape, np.int32)
    for i, key in enumerate(keys, 1):
        labels[masks[key] & (labels == 0)] = i
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (width, width))
    kept = np.zeros_like(labels)
    for i, key in enumerate(keys, 1):
        opened = cv2.morphologyEx((labels == i).astype(np.uint8), cv2.MORPH_OPEN, kernel)
        # Cutting a tail can leave its tip as an island; keep only pieces at least a quarter the size of
        # the group's largest piece (left and right sides are similar in size, so both survive).
        count, parts, stats, _ = cv2.connectedComponentsWithStats(opened, connectivity=8)
        if count > 1:
            largest = stats[1:, cv2.CC_STAT_AREA].max()
            for c in range(1, count):
                if stats[c, cv2.CC_STAT_AREA] >= largest / 4:
                    kept[parts == c] = i
    lost = (labels > 0) & (kept == 0)
    _, (iy, ix) = ndi.distance_transform_edt(kept == 0, return_indices=True)
    kept[lost] = kept[iy[lost], ix[lost]]
    for i, key in enumerate(keys, 1):
        masks[key] = kept == i


def smooth(mask, sigma=2.5):
    return cv2.GaussianBlur(mask.astype(np.float32), (0, 0), sigma) > 0.5


def contours_to_path(mask, spacing=5.0):
    """Trace each outline, resample it evenly and join the points with Catmull-Rom curves."""
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in contours:
        if cv2.contourArea(c) < 60:
            continue
        pts = c[:, 0].astype(np.float64)
        closed = np.vstack([pts, pts[:1]])
        dist = np.r_[0, np.cumsum(np.hypot(*np.diff(closed, axis=0).T))]
        count = max(8, int(dist[-1] / spacing))
        t = np.linspace(0, dist[-1], count, endpoint=False)
        p = np.column_stack([np.interp(t, dist, closed[:, 0]), np.interp(t, dist, closed[:, 1])])
        path = [f'M{p[0][0]:.1f} {p[0][1]:.1f}']
        for i in range(count):
            p0, p1, p2, p3 = p[i - 1], p[i], p[(i + 1) % count], p[(i + 2) % count]
            c1, c2 = p1 + (p2 - p0) / 6, p2 - (p3 - p1) / 6
            path.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}')
        parts.append(''.join(path) + 'Z')
    return ''.join(parts)


def main():
    image = cv2.imread(str(SRC))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
    body = body_mask(gray)
    masks = segment(gray, body)
    rows = np.arange(gray.shape[0])[:, None]
    for (view, group), m in list(masks.items()):
        if (view, group) in MAX_Y:
            below = m & (rows > MAX_Y[(view, group)])
            m &= ~below
            if group == 'biceps':  # the biceps basin also floods the forearm flexors
                masks[(view, 'forearms')] |= below & (rows <= MAX_Y[(view, 'forearms')])
    yy, xx = np.mgrid[:gray.shape[0], :gray.shape[1]]
    cx, cy, rx, ry = GLUTE
    rx_mirror = 2 * MID['back'] - cx
    glutes = np.zeros_like(body)
    for centre, side in ((cx, xx <= MID['back']), (rx_mirror, xx > MID['back'])):
        glutes |= ((np.abs(xx - centre) / rx) ** 2.6 + (np.abs(yy - cy) / ry) ** 2.6 <= 1) & side
    masks[('back', 'glutes')] = glutes & body & (yy > 420)
    for view, group, poly, *source in CARVE:
        shape = np.zeros_like(body, np.uint8)
        pts = np.array(poly, np.int32)
        cv2.fillPoly(shape, [pts, np.column_stack([int(round(2 * MID[view])) - pts[:, 0], pts[:, 1]])], 1)
        area = shape.astype(bool) & (masks[(view, source[0])] if source else body)
        for (v, g), m in masks.items():
            if v == view:
                m &= ~area
        masks[(view, group)] = masks.get((view, group), np.zeros_like(body)) | area
    painted = masks[('back', 'glutes')].copy()
    for view, group, poly in UNDER_SHORTS:
        shape = np.zeros_like(body, np.uint8)
        pts = np.array(poly, np.int32)
        mirrored = np.column_stack([int(round(2 * MID[view])) - pts[:, 0], pts[:, 1]])
        cv2.fillPoly(shape, [pts, mirrored], 1)
        area = shape.astype(bool) & body & ~painted
        masks[(view, group)] = masks.get((view, group), np.zeros_like(body)) | area
        painted |= area
    # The dark fabric: highlights there are drawn as a plain tint, since a colour blend vanishes on black.
    blur = cv2.GaussianBlur(gray, (0, 0), 1.2)
    near_mid = np.zeros_like(body)
    for view in VIEW_X:
        near_mid |= np.abs(xx - MID[view]) <= 112  # the shorts' width; arms start further out
    fabric = body & (blur < 60) & (yy > 380) & (yy < 575) & near_mid
    regions = {'front': {}, 'back': {}}
    for key, m in list(masks.items()):
        masks[key] = smooth(m) & body
    remove_slivers(masks)
    for (view, group), m in masks.items():
        skin, cloth = m & ~fabric, m & fabric
        regions[view][group] = {'d': contours_to_path(smooth(skin, 1.0) & m), 'fabric': contours_to_path(smooth(cloth, 1.0) & m)}

    bgra = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = alpha_channel(gray, body)
    bgra[bgra[:, :, 3] == 0, :3] = 0
    cv2.imwrite(str(OUT_IMAGE), bgra, [cv2.IMWRITE_WEBP_QUALITY, 92])
    OUT_JS.write_text('// Generated by tools/segment_anatomy.py from assets/anatomy-atlas.png. Do not edit by hand.\n'
                      f'window.GymAnatomyRegions = {json.dumps(regions, separators=(",", ":"))};\n', encoding='utf-8')

    if DEBUG:
        DEBUG.mkdir(parents=True, exist_ok=True)
        palette = [(255, 80, 80), (80, 200, 255), (80, 255, 120), (255, 200, 60), (220, 90, 255), (60, 120, 255),
                   (255, 140, 200), (40, 220, 220), (180, 255, 60), (255, 120, 20), (140, 140, 255), (0, 255, 200), (255, 255, 255), (120, 60, 160), (60, 90, 30)]
        names = sorted({g for _, g in masks})
        vis = image.copy()
        for (view, group), m in masks.items():
            color = np.array(palette[names.index(group) % len(palette)])
            vis[m] = (vis[m] * 0.45 + color * 0.55).astype(np.uint8)
            cnts, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            cv2.drawContours(vis, cnts, -1, (0, 140, 255), 1)
        for view in ('front', 'back'):
            x = int(round(MID[view]))
            cv2.line(vis, (x, 0), (x, vis.shape[0]), (255, 255, 0), 1)
        cv2.imwrite(str(DEBUG / 'regions.png'), vis)
        for view, (x0, x1) in VIEW_X.items():
            cv2.imwrite(str(DEBUG / f'regions_{view}.png'), cv2.resize(vis[:, x0:x1], None, fx=1.6, fy=1.6))
    print({v: sorted(r) for v, r in regions.items()}, OUT_IMAGE.stat().st_size, OUT_JS.stat().st_size)


if __name__ == '__main__':
    main()
