import { FaInfoCircle } from 'react-icons/fa'

import { useAlert } from '../../context/alert/alertContext'

const Alert = () => {
  const { alerts } = useAlert()
  return (
    alerts.length > 0 &&
    alerts.map(alert => (
      <div key={alert.id} className={`flex-align alert alert-${alert.type}`}>
        <FaInfoCircle /> {alert.msg}
      </div>
    ))
  )
}

export default Alert
