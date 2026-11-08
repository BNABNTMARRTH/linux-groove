#!/usr/bin/env python3
"""
Bake GLB anatomical models directly to compact binary buffers for Rust engine_wasm.
Pure Python standard library (no dependencies).
Zero emojis.
"""

import struct, json, os, math, random

def parse_glb(path):
    with open(path, "rb") as f:
        f.read(12)
        chunk_len, _ = struct.unpack("<II", f.read(8))
        gltf = json.loads(f.read(chunk_len).decode("utf-8", errors="ignore"))
        chunk2_len, _ = struct.unpack("<II", f.read(8))
        bin_data = f.read(chunk2_len)
        return gltf, bin_data

def get_acc(gltf, bin_data, acc_idx):
    acc = gltf["accessors"][acc_idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    offset = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    count = acc["count"]
    ctype = acc["componentType"]
    atype = acc["type"]
    comp_count = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[atype]
    type_code = {5126: "f", 5123: "H", 5125: "I", 5121: "B", 5120: "b", 5122: "h"}[ctype]
    fmt = "<" + (type_code * comp_count)
    item_size = struct.calcsize(fmt)
    stride = bv.get("byteStride", item_size)
    res = []
    for i in range(count):
        raw = bin_data[offset + i*stride: offset + i*stride + item_size]
        res.append(struct.unpack(fmt, raw))
    return res

def compose_mat4(t, q, s):
    qx, qy, qz, qw = q
    sx, sy, sz = s
    tx, ty, tz = t
    x2 = qx + qx; y2 = qy + qy; z2 = qz + qz
    xx = qx * x2; xy = qx * y2; xz = qx * z2
    yy = qy * y2; yz = qy * z2; zz = qz * z2
    wx = qw * x2; wy = qw * y2; wz = qw * z2
    m = [0.0] * 16
    m[0] = (1.0 - (yy + zz)) * sx
    m[1] = (xy + wz) * sx
    m[2] = (xz - wy) * sx
    m[4] = (xy - wz) * sy
    m[5] = (1.0 - (xx + zz)) * sy
    m[6] = (yz + wx) * sy
    m[8] = (xz + wy) * sz
    m[9] = (yz - wx) * sz
    m[10] = (1.0 - (xx + yy)) * sz
    m[12] = tx
    m[13] = ty
    m[14] = tz
    m[15] = 1.0
    return m

def mul_mat4(a, b):
    out = [0.0] * 16
    for col in range(4):
        for row in range(4):
            val = 0.0
            for k in range(4):
                val += a[k*4 + row] * b[col*4 + k]
            out[col*4 + row] = val
    return out

TARGET_COUNT = 8192

# =========================================================================
# 1. BAKE CORAZON (anim_heart.glb)
# =========================================================================
print("Procesando anim_heart.glb...")
gltf_heart, bin_heart = parse_glb("/Volumes/HDEXTERNO/linux_groove/pruebas_web/glb/anim_heart.glb")
prim_h = gltf_heart["meshes"][0]["primitives"][0]
pos_h = get_acc(gltf_heart, bin_heart, prim_h["attributes"]["POSITION"])
delta_h = get_acc(gltf_heart, bin_heart, prim_h["targets"][0]["POSITION"])
idx_h = get_acc(gltf_heart, bin_heart, prim_h["indices"])
tri_count_h = len(idx_h) // 3

# Centrar y normalizar escala
min_h = [min(p[c] for p in pos_h) for c in range(3)]
max_h = [max(p[c] for p in pos_h) for c in range(3)]
center_h = [(min_h[c] + max_h[c]) * 0.5 for c in range(3)]
scale_h = 2.0 / max(max_h[c] - min_h[c] for c in range(3))

heart_base = []
heart_delta = []

# Muestreo de 8,192 puntos
random.seed(42)
for i in range(TARGET_COUNT):
    if i < len(pos_h):
        p0 = pos_h[i]
        d0 = delta_h[i]
    else:
        tri = random.randint(0, tri_count_h - 1)
        i0 = idx_h[tri * 3][0]
        i1 = idx_h[tri * 3 + 1][0]
        i2 = idx_h[tri * 3 + 2][0]
        u = random.random()
        v = random.random()
        if u + v > 1.0:
            u = 1.0 - u
            v = 1.0 - v
        w = 1.0 - u - v
        p0 = [u*pos_h[i0][c] + v*pos_h[i1][c] + w*pos_h[i2][c] for c in range(3)]
        d0 = [u*delta_h[i0][c] + v*delta_h[i1][c] + w*delta_h[i2][c] for c in range(3)]
    
    # Normalizar
    norm_p = [(p0[c] - center_h[c]) * scale_h for c in range(3)]
    norm_d = [d0[c] * scale_h for c in range(3)]
    heart_base.append(norm_p)
    heart_delta.append(norm_d)

print(f"Corazon procesado: {len(heart_base)} puntos base + deltas")

# =========================================================================
# 2. BAKE MANO ANIMADA (hand_animation.glb)
# =========================================================================
print("Procesando hand_animation.glb...")
gltf_hand, bin_hand = parse_glb("/Volumes/HDEXTERNO/linux_groove/pruebas_web/glb/hand_animation.glb")
prim_hd = gltf_hand["meshes"][0]["primitives"][0]
pos_hd = get_acc(gltf_hand, bin_hand, prim_hd["attributes"]["POSITION"])
joints_hd = get_acc(gltf_hand, bin_hand, prim_hd["attributes"]["JOINTS_0"])
weights_hd = get_acc(gltf_hand, bin_hand, prim_hd["attributes"]["WEIGHTS_0"])
idx_hd = get_acc(gltf_hand, bin_hand, prim_hd["indices"])
tri_count_hd = len(idx_hd) // 3

skin_hd = gltf_hand["skins"][0]
joints_list = skin_hd["joints"]
inv_binds_hd = [list(m) for m in get_acc(gltf_hand, bin_hand, skin_hd["inverseBindMatrices"])]
nodes_hd = gltf_hand["nodes"]

parent_map_hd = {}
for i, n in enumerate(nodes_hd):
    for ch in n.get("children", []):
        parent_map_hd[ch] = i

# Animacion
anim_hd = gltf_hand["animations"][0]
samplers_hd = anim_hd["samplers"]
channels_hd = anim_hd["channels"]

# Cargar keyframes de tiempo y valores
anim_data = []
for ch in channels_hd:
    s = samplers_hd[ch["sampler"]]
    times = [t[0] for t in get_acc(gltf_hand, bin_hand, s["input"])]
    values = get_acc(gltf_hand, bin_hand, s["output"])
    anim_data.append({
        "node": ch["target"]["node"],
        "path": ch["target"]["path"],
        "times": times,
        "values": values
    })

def evaluate_node_transform(node_idx, t_anim):
    t = list(nodes_hd[node_idx].get("translation", [0.0, 0.0, 0.0]))
    q = list(nodes_hd[node_idx].get("rotation", [0.0, 0.0, 0.0, 1.0]))
    s = list(nodes_hd[node_idx].get("scale", [1.0, 1.0, 1.0]))
    
    for ch in anim_data:
        if ch["node"] == node_idx:
            times = ch["times"]
            values = ch["values"]
            # Buscar segmento temporal
            if t_anim <= times[0]:
                val = values[0]
            elif t_anim >= times[-1]:
                val = values[-1]
            else:
                # Interpolacion lineal
                idx = 0
                while idx < len(times) - 1 and times[idx + 1] < t_anim:
                    idx += 1
                t0, t1 = times[idx], times[idx + 1]
                factor = (t_anim - t0) / max(0.0001, t1 - t0)
                v0, v1 = values[idx], values[idx + 1]
                val = [v0[c] + factor * (v1[c] - v0[c]) for c in range(len(v0))]
            
            if ch["path"] == "translation":
                t = list(val)
            elif ch["path"] == "rotation":
                q = list(val)
            elif ch["path"] == "scale":
                s = list(val)
                
    return compose_mat4(t, q, s)

# Evaluar 4 poses claves de la animacion (0s, 1.15s, 2.3s, 3.45s)
key_times = [0.0, 1.15, 2.30, 3.45]
hand_poses_raw = [[] for _ in key_times]

# Precomputar puntos de muestreo en reposo
random.seed(101)
hand_sampled_points = []
for i in range(TARGET_COUNT):
    if i < len(pos_hd):
        v = pos_hd[i]
        j = joints_hd[i]
        w = weights_hd[i]
    else:
        tri = random.randint(0, tri_count_hd - 1)
        i0 = idx_hd[tri * 3][0]
        i1 = idx_hd[tri * 3 + 1][0]
        i2 = idx_hd[tri * 3 + 2][0]
        u = random.random()
        v_rand = random.random()
        if u + v_rand > 1.0:
            u = 1.0 - u
            v_rand = 1.0 - v_rand
        w_rand = 1.0 - u - v_rand
        v = [u*pos_hd[i0][c] + v_rand*pos_hd[i1][c] + w_rand*pos_hd[i2][c] for c in range(3)]
        dom = i0 if (u >= v_rand and u >= w_rand) else (i1 if v_rand >= w_rand else i2)
        j = joints_hd[dom]
        w = weights_hd[dom]
    hand_sampled_points.append((v, j, w))

# Normalizar dimensiones basadas en pose de reposo
min_hd = [min(p[0][c] for p in hand_sampled_points) for c in range(3)]
max_hd = [max(p[0][c] for p in hand_sampled_points) for c in range(3)]
center_hd = [(min_hd[c] + max_hd[c]) * 0.5 for c in range(3)]
scale_hd = 2.0 / max(max_hd[c] - min_hd[c] for c in range(3))

for pose_idx, t_val in enumerate(key_times):
    print(f"  Calculando pose #{pose_idx} (t = {t_val:.2f}s)...")
    local_mats = [evaluate_node_transform(i, t_val) for i in range(len(nodes_hd))]
    world_mats = [None] * len(nodes_hd)
    
    def get_w(idx):
        if world_mats[idx] is not None:
            return world_mats[idx]
        if idx in parent_map_hd:
            pw = get_w(parent_map_hd[idx])
            w = mul_mat4(pw, local_mats[idx])
        else:
            w = local_mats[idx]
        world_mats[idx] = w
        return w
        
    for i in range(len(nodes_hd)):
        get_w(i)
        
    skin_mats = []
    for i, jnode in enumerate(joints_list):
        w = world_mats[jnode]
        inv = inv_binds_hd[i]
        skin_mats.append(mul_mat4(w, inv))
        
    pose_pts = []
    for v0, j0, w0 in hand_sampled_points:
        sx, sy, sz = 0.0, 0.0, 0.0
        for k in range(4):
            wt = w0[k]
            if wt > 0:
                sm = skin_mats[j0[k]]
                px = sm[0]*v0[0] + sm[4]*v0[1] + sm[8]*v0[2] + sm[12]
                py = sm[1]*v0[0] + sm[5]*v0[1] + sm[9]*v0[2] + sm[13]
                pz = sm[2]*v0[0] + sm[6]*v0[1] + sm[10]*v0[2] + sm[14]
                sx += wt * px
                sy += wt * py
                sz += wt * pz
        norm_x = (sx - center_hd[0]) * scale_hd
        norm_y = (sy - center_hd[1]) * scale_hd
        norm_z = (sz - center_hd[2]) * scale_hd
        pose_pts.append([norm_x, norm_y, norm_z])
    hand_poses_raw[pose_idx] = pose_pts

print(f"Mano procesada: 4 poses cinemáticas calculadas ({len(hand_poses_raw[0])} puntos cada una)")

# =========================================================================
# 3. BAKE CRANEO (craneo.glb)
# =========================================================================
print("Procesando craneo.glb...")
gltf_craneo, bin_craneo = parse_glb("/Volumes/HDEXTERNO/linux_groove/pruebas_web/glb/craneo.glb")
craneo_meshes = gltf_craneo["meshes"]

all_craneo_pts = []
all_craneo_deltas = []

pts_per_mesh = TARGET_COUNT // len(craneo_meshes)
extra = TARGET_COUNT - (pts_per_mesh * len(craneo_meshes))

# Calcular caja envolvente global del craneo
all_v = []
for m in craneo_meshes:
    pacc = m["primitives"][0]["attributes"]["POSITION"]
    pos_data = get_acc(gltf_craneo, bin_craneo, pacc)
    all_v.extend(pos_data[::10])

min_c = [min(p[c] for p in all_v) for c in range(3)]
max_c = [max(p[c] for p in all_v) for c in range(3)]
center_c = [(min_c[c] + max_c[c]) * 0.5 for c in range(3)]
scale_c = 2.0 / max(max_c[c] - min_c[c] for c in range(3))

random.seed(999)
for m_idx, m in enumerate(craneo_meshes):
    prim_c = m["primitives"][0]
    pos_c = get_acc(gltf_craneo, bin_craneo, prim_c["attributes"]["POSITION"])
    idx_c = get_acc(gltf_craneo, bin_craneo, prim_c["indices"])
    t_count = len(idx_c) // 3
    
    # Calcular centro de masa del hueso para vector de explosion
    m_min = [min(p[c] for p in pos_c) for c in range(3)]
    m_max = [max(p[c] for p in pos_c) for c in range(3)]
    bone_center = [(m_min[c] + m_max[c]) * 0.5 for c in range(3)]
    
    # Vector de separacion radial desde el centro craneal
    dx = (bone_center[0] - center_c[0]) * 1.5
    dy = (bone_center[1] - center_c[1]) * 1.5
    dz = (bone_center[2] - center_c[2]) * 1.5
    # Normalizar direccion
    len_d = math.sqrt(dx*dx + dy*dy + dz*dz)
    if len_d > 0.001:
        expl_vec = [dx/len_d * 0.85, dy/len_d * 0.85, dz/len_d * 0.85]
    else:
        expl_vec = [0.0, 0.5, 0.0]
        
    num_to_sample = pts_per_mesh + (extra if m_idx == len(craneo_meshes) - 1 else 0)
    for i in range(num_to_sample):
        tri = random.randint(0, t_count - 1)
        i0 = idx_c[tri * 3][0]
        i1 = idx_c[tri * 3 + 1][0]
        i2 = idx_c[tri * 3 + 2][0]
        u = random.random()
        v_rand = random.random()
        if u + v_rand > 1.0:
            u = 1.0 - u
            v_rand = 1.0 - v_rand
        w_rand = 1.0 - u - v_rand
        px = u*pos_c[i0][0] + v_rand*pos_c[i1][0] + w_rand*pos_c[i2][0]
        py = u*pos_c[i0][1] + v_rand*pos_c[i1][1] + w_rand*pos_c[i2][1]
        pz = u*pos_c[i0][2] + v_rand*pos_c[i1][2] + w_rand*pos_c[i2][2]
        
        norm_x = (px - center_c[0]) * scale_c
        norm_y = (py - center_c[1]) * scale_c
        norm_z = (pz - center_c[2]) * scale_c
        
        all_craneo_pts.append([norm_x, norm_y, norm_z])
        all_craneo_deltas.append(expl_vec)

print(f"Craneo procesado: {len(all_craneo_pts)} puntos de 25 huesos con vectores de despiece")

# =========================================================================
# 4. EXPORTAR BUFFER BINARIO A engine_wasm/assets
# =========================================================================
out_dir = "/Volumes/HDEXTERNO/linux_groove/pruebas_web/engine_wasm/assets"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "anatomy_models_baked.bin")

with open(out_path, "wb") as f:
    # Magic header
    f.write(b"GROOVE3D")
    f.write(struct.pack("<II", 1, TARGET_COUNT))
    
    # 1. Mano: 4 poses (8,192 pts * 3 coords * 4 bytes * 4 poses)
    for pose in hand_poses_raw:
        for pt in pose:
            f.write(struct.pack("<fff", pt[0], pt[1], pt[2]))
            
    # 2. Corazon: Base + Deltas (8,192 pts * 3 coords * 4 bytes * 2)
    for pt in heart_base:
        f.write(struct.pack("<fff", pt[0], pt[1], pt[2]))
    for dt in heart_delta:
        f.write(struct.pack("<fff", dt[0], dt[1], dt[2]))
        
    # 3. Craneo: Base + Vectores de Despiece (8,192 pts * 3 coords * 4 bytes * 2)
    for pt in all_craneo_pts:
        f.write(struct.pack("<fff", pt[0], pt[1], pt[2]))
    for dt in all_craneo_deltas:
        f.write(struct.pack("<fff", dt[0], dt[1], dt[2]))

file_size = os.path.getsize(out_path)
print(f"\nExito! Archivo binario generado en: {out_path} ({file_size / 1024:.1f} KB)")
