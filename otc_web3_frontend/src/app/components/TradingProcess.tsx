'use client';

import { Card, Typography, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function TradingProcess() {
  const { t } = useTranslation();

  return (
    <Card>
      <Title level={2} className="text-center mb-8">{t('process.title')}</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={6}>
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">1</div>
            <Title level={4}>{t('process.step1.title')}</Title>
            <Paragraph>{t('process.step1.desc')}</Paragraph>
          </div>
        </Col>
        <Col xs={24} md={6}>
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">2</div>
            <Title level={4}>{t('process.step2.title')}</Title>
            <Paragraph>{t('process.step2.desc')}</Paragraph>
          </div>
        </Col>
        <Col xs={24} md={6}>
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">3</div>
            <Title level={4}>{t('process.step3.title')}</Title>
            <Paragraph>{t('process.step3.desc')}</Paragraph>
          </div>
        </Col>
        <Col xs={24} md={6}>
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">4</div>
            <Title level={4}>{t('process.step4.title')}</Title>
            <Paragraph>{t('process.step4.desc')}</Paragraph>
          </div>
        </Col>
      </Row>
    </Card>
  );
} 