
import sys
import os
import zlib
import base64
import urllib.parse
from dataclasses import dataclass, field
from typing import List, Optional

# --- Graph Data Structures ---

@dataclass
class Node:
    id: str
    label: str
    x: int
    y: int
    width: int
    height: int
    fill_color: str
    stroke_color: str
    shape: str = "rectangle"

@dataclass
class Edge:
    id: str
    source_id: str
    target_id: str
    label: str
    points: List[tuple] = field(default_factory=list)
    dashed: bool = False

# --- Data Definition (The Architecture) ---

NODES = [
    Node("2", "App (shirube)", 350, 50, 120, 60, "#dae8fc", "#6c8ebf"),
    Node("3", "BufferState", 350, 160, 120, 60, "#d5e8d4", "#82b366"),
    Node("4", "Adapter (FS/Mem)", 350, 550, 120, 60, "#f8cecc", "#b85450"),
    Node("5", "Parser", 150, 160, 120, 60, "#fff2cc", "#d6b656"),
    Node("6", "Diff", 150, 270, 120, 60, "#fff2cc", "#d6b656"),
    Node("7", "Executor", 150, 380, 120, 60, "#fff2cc", "#d6b656"),
    Node("8", "Renderer", 550, 160, 120, 60, "#e1d5e7", "#9673a6"),
    Node("9", "Window", 550, 270, 120, 60, "#e1d5e7", "#9673a6"),
    Node("100", "Config", 600, 50, 80, 60, "#ffe6cc", "#d79b00", shape="note"),
]

EDGES = [
    Edge("10", "2", "3", "Manages"),
    Edge("11", "2", "8", "Calls"),
    Edge("12", "8", "9", "Updates Buffer"),
    Edge("13", "3", "8", "Reads", dashed=True),
    Edge("14", "2", "5", "Buffer Content"),
    Edge("15", "5", "6", "Parsed Entries"),
    Edge("16", "3", "6", "Compare", dashed=True),
    Edge("17", "6", "7", "Actions"),
    Edge("18", "7", "4", "FS Ops", points=[(210, 580)]),
    Edge("19", "2", "4", "ListDir", points=[(480, 520)]),
    Edge("20", "100", "2", "Loads", dashed=True),
]

# --- XML Generation (Draw.io Model) ---

def generate_mx_graph_model():
    xml = []
    xml.append('<mxGraphModel dx="1000" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">')
    xml.append('  <root>')
    xml.append('    <mxCell id="0" />')
    xml.append('    <mxCell id="1" parent="0" />')

    for n in NODES:
        style = f"rounded=1;whiteSpace=wrap;html=1;fillColor={n.fill_color};strokeColor={n.stroke_color};"
        if n.shape == "note":
            style = f"shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor={n.fill_color};strokeColor={n.stroke_color};"
        elif "fontStyle=1" in n.label: # Hack for App header if needed, but let's keep simple
             style += "fontStyle=1;"
        
        xml.append(f'    <mxCell id="{n.id}" value="{n.label}" style="{style}" vertex="1" parent="1">')
        xml.append(f'      <mxGeometry x="{n.x}" y="{n.y}" width="{n.width}" height="{n.height}" as="geometry" />')
        xml.append('    </mxCell>')

    for e in EDGES:
        style = "endArrow=classic;html=1;"
        if e.dashed:
            style += "dashed=1;"
        
        xml.append(f'    <mxCell id="{e.id}" value="{e.label}" style="{style}" edge="1" parent="1" source="{e.source_id}" target="{e.target_id}">')
        xml.append('      <mxGeometry relative="1" as="geometry">')
        if e.points:
            xml.append('        <Array as="points">')
            for (px, py) in e.points:
                xml.append(f'          <mxPoint x="{px}" y="{py}" />')
            xml.append('        </Array>')
        xml.append('      </mxGeometry>')
        xml.append('    </mxCell>')

    xml.append('  </root>')
    xml.append('</mxGraphModel>')
    return "\n".join(xml)

# --- Encoding (Skill Logic) ---
# Re-implementing here to be self-contained within this script if needed, 
# or we can import. Importing is safer to stay in sync.
# But for simplicity in this generated script, I'll inline the simple logic.
def encode_for_drawio(xml_str):
    try:
        quoted = urllib.parse.quote(xml_str, safe='~()*!.\'')
        compressor = zlib.compressobj(wbits=-15)
        compressed_data = compressor.compress(quoted.encode('utf-8')) + compressor.flush()
        return base64.b64encode(compressed_data).decode('utf-8')
    except Exception as e:
        print(f"Encoding Error: {e}")
        return ""

# --- Visual SVG Generation ---

def generate_visual_svg_elements():
    svg_elements = []
    
    # 1. Edges First (so they are behind nodes)
    # Note: Proper routing is hard without exact coordinates for start/end.
    # We will do simple center-to-center lines or use the explicit points.
    
    node_map = {n.id: n for n in NODES}
    
    svg_elements.append('<g id="edges">')
    for e in EDGES:
        src = node_map.get(e.source_id)
        tgt = node_map.get(e.target_id)
        if not src or not tgt: continue
        
        # Calculate centers
        src_cx, src_cy = src.x + src.width/2, src.y + src.height/2
        tgt_cx, tgt_cy = tgt.x + tgt.width/2, tgt.y + tgt.height/2
        
        # Build path
        d = f"M {src_cx} {src_cy}"
        
        if e.points:
            for (px, py) in e.points:
                d += f" L {px} {py}"
        
        d += f" L {tgt_cx} {tgt_cy}"
        
        dash_attr = 'stroke-dasharray="5,5"' if e.dashed else ''
        svg_elements.append(f'  <path d="{d}" stroke="black" fill="none" marker-end="url(#arrowhead)" {dash_attr} />')
        
        # Label (approximate middle)
        mid_x, mid_y = (src_cx + tgt_cx)/2, (src_cy + tgt_cy)/2
        if e.points:
             # simple mid point logic if points exist: take the first point (simplification)
             mid_x, mid_y = e.points[0]
             
        # Background rect for label readability
        # Calculating text width is hard, just standard offset
        svg_elements.append(f'  <text x="{mid_x}" y="{mid_y}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#444" dy="-5" style="background-color: white;">{e.label}</text>')

    svg_elements.append('</g>')

    # 2. Nodes
    svg_elements.append('<g id="nodes">')
    for n in NODES:
        # Note shape
        if n.shape == "note":
            # Simple polygon for note
            pts = f"{n.x},{n.y} {n.x+n.width-15},{n.y} {n.x+n.width},{n.y+15} {n.x+n.width},{n.y+n.height} {n.x},{n.y+n.height}"
            svg_elements.append(f'  <polygon points="{pts}" fill="{n.fill_color}" stroke="{n.stroke_color}" stroke-width="1" />')
            # The folder corner
            corner = f"{n.x+n.width-15},{n.y} {n.x+n.width-15},{n.y+15} {n.x+n.width},{n.y+15}"
            svg_elements.append(f'  <polyline points="{corner}" fill="none" stroke="{n.stroke_color}" stroke-width="1" />')
        else:
            # Rectangle
            svg_elements.append(f'  <rect x="{n.x}" y="{n.y}" width="{n.width}" height="{n.height}" rx="5" ry="5" fill="{n.fill_color}" stroke="{n.stroke_color}" stroke-width="1" />')
        
        # Label (centered)
        # Split lines if needed? For now simple
        svg_elements.append(f'  <text x="{n.x + n.width/2}" y="{n.y + n.height/2}" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="black">{n.label}</text>')
    
    svg_elements.append('</g>')
    
    return "\n".join(svg_elements)

# --- Main ---

def main():
    # 1. Generate XML
    xml_content = generate_mx_graph_model()
    
    # 2. Encode XML
    encoded_content = encode_for_drawio(xml_content)
    
    # 3. Generate Visual SVG
    visual_content = generate_visual_svg_elements()
    
    # 4. Construct Final SVG
    # Include arrowhead marker definition
    arrow_head_def = """
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="black" />
      </marker>
    </defs>
    """
    
    # ViewBox: cover all nodes. Min X ~150, Max X ~680. Min Y ~50, Max Y ~610.
    # Padding: 50. ViewBox: 100 0 650 650
    final_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100%" height="100%" viewBox="100 0 650 650" content="{encoded_content}">
{arrow_head_def}
<rect width="100%" height="100%" fill="white" />
{visual_content}
</svg>"""

    os.makedirs("docs", exist_ok=True)
    out_path = "docs/architecture.svg"
    with open(out_path, "w") as f:
        f.write(final_svg)
    
    print(f"Generated {out_path}")

if __name__ == "__main__":
    main()
