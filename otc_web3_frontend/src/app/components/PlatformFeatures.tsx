'use client';

import { Card, Typography, Row, Col } from 'antd';
import { SwapOutlined, SafetyOutlined, GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function PlatformFeatures() {
  const { t } = useTranslation();

  return (
    <Row gutter={[24, 24]} className="mb-8">
      <Col xs={24} md={8}>
        <Card className="text-center h-full">
          <SwapOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
          <Title level={4}>{t('features.fastTrade.title')}</Title>
          <Paragraph>
            {t('features.fastTrade.desc')}
          </Paragraph>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="text-center h-full">
          <SafetyOutlined style={{ fontSize: '36px', color: '#52c41a' }} />
          <Title level={4}>{t('features.security.title')}</Title>
          <Paragraph>
            {t('features.security.desc')}
          </Paragraph>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card className="text-center h-full">
          <GlobalOutlined style={{ fontSize: '36px', color: '#722ed1' }} />
          <Title level={4}>{t('features.global.title')}</Title>
          <Paragraph>
            {t('features.global.desc')}
          </Paragraph>
        </Card>
      </Col>
    </Row>
  );
} 