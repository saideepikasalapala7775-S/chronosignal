"""Chronosignal Demo Dataset Generator:
Implements the exact 4-stage temporal demo playback with forward spacing:
- Stage 1: Base = -6.9 days (-165.6h, -163.6h, -161.6h)
- Stage 2: Base = -3.8 days (-91.2h, -89.2h, -87.2h)
- Stage 3: Base = -18 hours (-18h, -16h, -14h) -> Count_24h = 6 signals
- Stage 4: Base = -2 hours (-2h, -1h, now) -> Total 12 signals
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from backend.models import SignalIngestRequest


def get_demo_stages(base_now: datetime) -> Dict[int, List[SignalIngestRequest]]:
    """Returns the 4 demo stages keyed by stage integer (1, 2, 3, 4)."""
    if base_now.tzinfo is None:
        base_now = base_now.replace(tzinfo=timezone.utc)

    stages: Dict[int, List[SignalIngestRequest]] = {
        1: [
            SignalIngestRequest(
                text="Preprint: Continuous-depth neural ODEs and liquid time-constant neural networks show 10x parameter efficiency on edge time-series forecasting.",
                source="arXiv",
                url="https://arxiv.org/abs/2602.04189",
                author="researcher_k",
                timestamp=base_now - timedelta(hours=165.6),
            ),
            SignalIngestRequest(
                text="Show HN: Embedded rust implementation of variable time-step liquid neural network models running on edge microcontrollers.",
                source="HackerNews",
                url="https://news.ycombinator.com/item?id=4189201",
                author="embedded_dev",
                timestamp=base_now - timedelta(hours=163.6),
            ),
            SignalIngestRequest(
                text="Interesting paper on r/MachineLearning about liquid neural networks bypassing transformer quadratic complexity for streaming edge sensor telemetry.",
                source="Reddit",
                url="https://reddit.com/r/MachineLearning/comments/1q8yzk",
                author="synth_wanderer",
                timestamp=base_now - timedelta(hours=161.6),
            ),
        ],
        2: [
            SignalIngestRequest(
                text="Discussion in PyTorch-Edge discord: Benchmarked liquid neural networks against Mamba for drone telemetry, latency is significantly lower.",
                source="Discord",
                url="https://discord.gg/edge-ai-group",
                author="drone_pilot_99",
                timestamp=base_now - timedelta(hours=91.2),
            ),
            SignalIngestRequest(
                text="Release v0.2.0 of liquid-torch-edge: Custom CUDA kernels for adaptive liquid neural network ODE solver with streaming backpropagation on robotics sensors.",
                source="GitHub",
                url="https://github.com/liquid-ai-edge/liquid-torch-edge",
                author="alx_dev",
                timestamp=base_now - timedelta(hours=89.2),
            ),
            SignalIngestRequest(
                text="Our autonomous robotics lab just switched edge micro-controllers to liquid neural network architectures for low-power tactile sensor feedback.",
                source="X/Twitter",
                url="https://x.com/robotics_lab/status/18820491",
                author="@robotics_lab",
                timestamp=base_now - timedelta(hours=87.2),
            ),
        ],
        3: [
            SignalIngestRequest(
                text="Benchmarking Liquid Neural Network Architectures on Neuromorphic Hardware: Zero-shot Adaptation under Sensor Drift.",
                source="arXiv",
                url="https://arxiv.org/abs/2602.09112",
                author="dr_chen_ai",
                timestamp=base_now - timedelta(hours=18.0),
            ),
            SignalIngestRequest(
                text="Ask HN: Anyone deploying Liquid Neural Networks in production for industrial vibration and acoustic anomaly detection on edge devices?",
                source="HackerNews",
                url="https://news.ycombinator.com/item?id=4194012",
                author="industrial_iot",
                timestamp=base_now - timedelta(hours=16.0),
            ),
            SignalIngestRequest(
                text="Stanford robotics group validates liquid time-constant neural network stability under adversarial sensor noise. Huge implications for autonomous drones.",
                source="X/Twitter",
                url="https://x.com/stanford_robotics/status/18841028",
                author="@stanford_robotics",
                timestamp=base_now - timedelta(hours=14.0),
            ),
        ],
        4: [
            SignalIngestRequest(
                text="v1.0.0 official release of OpenLiquidNet: Production C++ runtime with ONNX export for liquid neural network models on Jetson and Raspberry Pi.",
                source="GitHub",
                url="https://github.com/open-liquid/openliquidnet",
                author="core_maintainer",
                timestamp=base_now - timedelta(hours=2.0),
            ),
            SignalIngestRequest(
                text="Mega-thread: Why top edge robotics startups are replacing RNNs and lightweight Transformers with liquid neural networks for continuous control.",
                source="Reddit",
                url="https://reddit.com/r/robotics/comments/1qb930a",
                author="neuro_engineer",
                timestamp=base_now - timedelta(hours=1.0),
            ),
            SignalIngestRequest(
                text="Robotics Engineering meetup just announced full keynotes on Liquid Neural Network hardware accelerators and continuous adaptive memory.",
                source="Discord",
                url="https://discord.gg/robotics-engineers",
                author="organizer_sarah",
                timestamp=base_now,
            ),
        ],
    }
    return stages


def get_ambient_background_signals(base_now: datetime) -> List[SignalIngestRequest]:
    """Generates ambient background clusters for rich multi-topic intelligence visualization."""
    if base_now.tzinfo is None:
        base_now = base_now.replace(tzinfo=timezone.utc)

    return [
        SignalIngestRequest(
            text="Silicon-photonic co-packaged optics prototype achieves 1.6 Tbps interconnect bandwidth in lab demonstration.",
            source="arXiv",
            url="https://arxiv.org/abs/2601.08219",
            author="photonics_guy",
            timestamp=base_now - timedelta(days=5, hours=4),
        ),
        SignalIngestRequest(
            text="Silicon-photonic optical compute startup raises Series A to build optical matrix-multiplication accelerators for datacenters.",
            source="HackerNews",
            url="https://news.ycombinator.com/item?id=4185010",
            author="venture_beat",
            timestamp=base_now - timedelta(days=4, hours=2),
        ),
        SignalIngestRequest(
            text="Thermal stability testing of silicon-photonic transceiver waveguides shows minimal drift over 500 operating hours.",
            source="GitHub",
            url="https://github.com/optics-lab/silicon-photonic-testing",
            author="optics_researcher",
            timestamp=base_now - timedelta(days=3),
        ),
        SignalIngestRequest(
            text="Zero-knowledge rollup state compression using recursive SNARKs reduces L1 posting gas fees by 60 percent.",
            source="GitHub",
            url="https://github.com/zk-state-compressor/zk-rollup-core",
            author="cryptodev",
            timestamp=base_now - timedelta(hours=36),
        ),
        SignalIngestRequest(
            text="Audit report on recursive SNARK state compression circuits for zero-knowledge rollups released by security researchers.",
            source="X/Twitter",
            url="https://x.com/zk_audit/status/18839011",
            author="@zk_audit",
            timestamp=base_now - timedelta(hours=22),
        ),
    ]
