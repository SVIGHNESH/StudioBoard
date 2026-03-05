import { useEffect, useMemo, useRef, useState } from "react";
import { useBoardStore } from "../../stores/boardStore";
import type { Primitive, Shape3DPrimitive } from "shared/primitives";
import * as THREE from "three";
import styles from "./Canvas3D.module.css";

type Transform = { scale: number; offsetX: number; offsetY: number };

type Canvas3DProps = {
  transform: Transform;
};

const toScenePosition = (x: number, y: number) => ({ x, y: -y });

const colorToThree = (color: string) => new THREE.Color(color);

const buildGeometry = (primitive: Shape3DPrimitive) => {
  if (primitive.shape === "sphere") {
    const radius = Math.max(1, Math.min(primitive.size.x, primitive.size.y) / 2);
    return new THREE.SphereGeometry(radius, 36, 24);
  }
  if (primitive.shape === "cube") {
    return new THREE.BoxGeometry(
      Math.max(1, primitive.size.x),
      Math.max(1, primitive.size.y),
      Math.max(1, primitive.size.z)
    );
  }
  if (primitive.shape === "cylinder") {
    const radius = Math.max(1, Math.min(primitive.size.x, primitive.size.z) / 2);
    return new THREE.CylinderGeometry(radius, radius, Math.max(1, primitive.size.y), 28, 1);
  }
  if (primitive.shape === "cone") {
    const radius = Math.max(1, Math.min(primitive.size.x, primitive.size.z) / 2);
    return new THREE.ConeGeometry(radius, Math.max(1, primitive.size.y), 28, 1);
  }
  const radius = Math.max(1, Math.min(primitive.size.x, primitive.size.z) / 2);
  return new THREE.ConeGeometry(radius, Math.max(1, primitive.size.y), 4, 1);
};

const isShape3d = (primitive: Primitive): primitive is Shape3DPrimitive => primitive.type === "shape3d";

export const Canvas3D = ({ transform }: Canvas3DProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshesRef = useRef(new Map<string, THREE.Group>());
  const { primitives } = useBoardStore();
  const [viewport, setViewport] = useState({ width: 1, height: 1 });

  const shapePrimitives = useMemo(
    () => primitives.filter(isShape3d),
    [primitives]
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(120, 180, 200);
    scene.add(ambient, directional);

    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -2000, 2000);
    camera.position.z = 800;
    cameraRef.current = camera;

    return () => {
      meshesRef.current.forEach((group) => {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
          if (child instanceof THREE.LineSegments) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
      meshesRef.current.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setViewport({ width: Math.max(1, width), height: Math.max(1, height) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    camera.left = 0;
    camera.right = width / transform.scale;
    camera.top = 0;
    camera.bottom = -height / transform.scale;
    camera.updateProjectionMatrix();
    scene.position.set(transform.offsetX / transform.scale, -transform.offsetY / transform.scale, 0);
    renderer.setSize(width, height, false);

    meshesRef.current.forEach((group) => {
      scene.remove(group);
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
        if (child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    meshesRef.current.clear();

    shapePrimitives.forEach((primitive) => {
      const geometry = buildGeometry(primitive);
      const material = new THREE.MeshStandardMaterial({
        color: colorToThree(primitive.color),
        roughness: 0.4,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const edgeColor = colorToThree(primitive.color).clone().multiplyScalar(0.6);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.9 })
      );
      const group = new THREE.Group();
      group.add(mesh, edges);
      const pos = toScenePosition(primitive.position.x, primitive.position.y);
      group.position.set(pos.x, pos.y, primitive.position.z);
      group.rotation.set(primitive.rotation.x, primitive.rotation.y, primitive.rotation.z);
      scene.add(group);
      meshesRef.current.set(primitive.id, group);
    });

    renderer.render(scene, camera);
  }, [shapePrimitives, transform, viewport]);

  return <div ref={mountRef} className={styles.root} />;
};
